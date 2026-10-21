const { Op } = require("sequelize");
const { sequelize, Booking, Staff, User, Service } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");

/**
 * Format date helper matching index (4).html fmtDate
 */
const formatNotificationDate = (dateStr, timeStr) => {
  if (!dateStr) return timeStr || "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    const tmStr = tm.toISOString().split("T")[0];

    let dayPart = dateStr;
    if (dateStr === todayStr) dayPart = "today";
    else if (dateStr === tmStr) dayPart = "tomorrow";
    else {
      const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const MON = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      dayPart = `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
    }

    if (timeStr) {
      return `${dayPart}, ${timeStr}`;
    }
    return dayPart;
  } catch {
    return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
  }
};

/**
 * Helper to build lookup condition by numeric id or unique code
 */
const buildBookingLookup = (identifier) => {
  const numericId = parseInt(identifier, 10);
  if (!isNaN(numericId) && String(numericId) === String(identifier).trim()) {
    return { id: numericId };
  }
  return { code: String(identifier).trim() };
};

/**
 * Client Cancels a Booking
 * Allowed statuses: ['requested', 'confirmed', 'assigned']
 * As defined in index (4).html line 1111:
 * const canCancel = ['requested', 'confirmed', 'assigned'].includes(b.status);
 */
const cancelClientBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const body = req.body || {};
    const cancelReason =
      body.cancelReason || body.reason || "Cancelled by client";

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Booking ${booking.code} is already cancelled`,
        400
      );
    }

    // Check if completed
    if (booking.status === "completed") {
      await transaction.rollback();
      return errorResponse(
        res,
        "Cannot cancel an already completed booking",
        400
      );
    }

    // Guard: Client can only cancel if in requested, confirmed, or assigned state
    const allowedClientStatuses = ["requested", "confirmed", "assigned"];
    if (!allowedClientStatuses.includes(booking.status)) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Cannot cancel visit with status '${booking.status}'. Visits that are on the way or in progress cannot be cancelled directly by client. Please contact the care desk.`,
        400
      );
    }

    // Optional ownership verification if client is authenticated
    if (
      req.user &&
      req.user.phone &&
      req.user.role !== "admin" &&
      booking.clientPhone
    ) {
      const userPhoneDigits = String(req.user.phone).replace(/\D/g, "").slice(-10);
      const bookingPhoneDigits = String(booking.clientPhone).replace(/\D/g, "").slice(-10);
      if (userPhoneDigits && bookingPhoneDigits && userPhoneDigits !== bookingPhoneDigits) {
        await transaction.rollback();
        return errorResponse(
          res,
          "You are not authorized to cancel this booking",
          403
        );
      }
    }

    const now = new Date();
    const existingHistory = Array.isArray(booking.history)
      ? [...booking.history]
      : [];
    existingHistory.push({
      status: "cancelled",
      at: now.toISOString(),
      by: "client",
      note: cancelReason,
    });

    // Update booking status and history
    await booking.update(
      {
        status: "cancelled",
        notes: booking.notes
          ? `${booking.notes}\n[Cancelled by client: ${cancelReason}]`
          : cancelReason,
        history: existingHistory,
      },
      { transaction }
    );

    await transaction.commit();

    // Refetch refreshed booking with staff details
    const refreshedBooking = await Booking.findOne({
      where: { id: booking.id },
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name", "phone", "email"],
            },
          ],
        },
      ],
    });

    const serviceDisplayName = booking.serviceName || booking.service;
    const notificationDateTime = formatNotificationDate(
      booking.date,
      booking.time
    );

    // Notifications matching index (4).html:1927
    // notify('admin', 'Booking cancelled ' + b.code, `${b.clientName} cancelled ${svcB(b).name} for ${b.patientName}.`, b.id);
    // if(b.staffId) notify('staff:' + b.staffId, 'Visit cancelled', `${b.patientName} · ${fmtDate(b.date)}, ${b.time} was cancelled by the family.`, b.id);
    const notifications = {
      admin: {
        to: "admin",
        title: `Booking cancelled ${booking.code}`,
        body: `${booking.clientName} cancelled ${serviceDisplayName} for ${booking.patientName}.`,
        bookingId: booking.id,
        bookingCode: booking.code,
      },
    };

    if (booking.staffId) {
      notifications.staff = {
        to: `staff:${booking.staffId}`,
        title: "Visit cancelled",
        body: `${booking.patientName} · ${notificationDateTime} was cancelled by the family.`,
        bookingId: booking.id,
        bookingCode: booking.code,
      };
    }

    // Attach cancelReason explicitly to result data
    const bookingJson = refreshedBooking.toJSON();
    bookingJson.cancelReason = cancelReason;

    return successResponse(
      res,
      {
        booking: bookingJson,
        cancelReason,
        cancelledBy: "client",
        cancelledAt: now.toISOString(),
        notifications,
      },
      `Booking ${booking.code} cancelled successfully.`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to cancel booking",
      500,
      error
    );
  }
};

/**
 * Admin Cancels a Booking
 * Allowed statuses: ACTIVE = ['requested', 'confirmed', 'assigned', 'on_the_way', 'in_progress']
 * As defined in index (4).html line 1513:
 * ACTIVE.includes(b.status)
 */
const cancelAdminBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const body = req.body || {};
    const cancelReason =
      body.cancelReason || body.reason || "Cancelled by care desk";

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    // Check if already cancelled
    if (booking.status === "cancelled") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Booking ${booking.code} is already cancelled`,
        400
      );
    }

    // Check if completed
    if (booking.status === "completed") {
      await transaction.rollback();
      return errorResponse(
        res,
        "Cannot cancel an already completed booking",
        400
      );
    }

    // Guard: Admin can cancel any active booking
    const activeStatuses = [
      "requested",
      "confirmed",
      "assigned",
      "on_the_way",
      "in_progress",
    ];
    if (!activeStatuses.includes(booking.status)) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Cannot cancel booking with current status '${booking.status}'.`,
        400
      );
    }

    const now = new Date();
    const existingHistory = Array.isArray(booking.history)
      ? [...booking.history]
      : [];
    existingHistory.push({
      status: "cancelled",
      at: now.toISOString(),
      by: "admin",
      note: cancelReason,
    });

    // Update booking status and history
    await booking.update(
      {
        status: "cancelled",
        notes: booking.notes
          ? `${booking.notes}\n[Cancelled by care desk: ${cancelReason}]`
          : cancelReason,
        history: existingHistory,
      },
      { transaction }
    );

    await transaction.commit();

    // Refetch refreshed booking with staff details
    const refreshedBooking = await Booking.findOne({
      where: { id: booking.id },
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name", "phone", "email"],
            },
          ],
        },
      ],
    });

    const notificationDate = formatNotificationDate(booking.date);

    // Notifications matching index (4).html:2010
    // notify('client:' + b.clientPhone, 'Booking cancelled', `Your booking ${b.code} was cancelled by the care desk. Call us if this is unexpected.`, b.id);
    // if(b.staffId) notify('staff:' + b.staffId, 'Visit cancelled', `${b.patientName} · ${fmtDate(b.date)} was cancelled.`, b.id);
    const notifications = {
      client: {
        to: `client:${booking.clientPhone}`,
        title: "Booking cancelled",
        body: `Your booking ${booking.code} was cancelled by the care desk. Call us if this is unexpected.`,
        bookingId: booking.id,
        bookingCode: booking.code,
      },
    };

    if (booking.staffId) {
      notifications.staff = {
        to: `staff:${booking.staffId}`,
        title: "Visit cancelled",
        body: `${booking.patientName} · ${notificationDate} was cancelled.`,
        bookingId: booking.id,
        bookingCode: booking.code,
      };
    }

    // Attach cancelReason explicitly to result data
    const bookingJson = (refreshedBooking || booking).toJSON();
    bookingJson.cancelReason = cancelReason;

    return successResponse(
      res,
      {
        booking: bookingJson,
        cancelReason,
        cancelledBy: "admin",
        cancelledAt: now.toISOString(),
        notifications,
      },
      `Booking ${booking.code} cancelled successfully by care desk.`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to cancel booking",
      500,
      error
    );
  }
};

module.exports = {
  cancelClientBooking,
  cancelAdminBooking,
};
