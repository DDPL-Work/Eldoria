const { Op } = require("sequelize");
const { sequelize, Booking, Staff, User, Service, City, Enquiry, Client, Setting } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");
const { generateBookingId } = require("../helpers/generateBookingID");
const { generateClientId } = require("../helpers/generateClientID");
const { scoreAndRankStaffForBooking } = require("../helpers/staffMatching.helper");

/**
 * Format date helper for human-readable notification text
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
      const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      dayPart = `on ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
    }

    return `${dayPart} at ${timeStr || "scheduled time"}`;
  } catch {
    return `${dateStr} ${timeStr || ""}`;
  }
};

/**
 * Look up helper for Booking by ID or Code
 */
const buildBookingLookup = (identifier) => {
  const numericId = parseInt(identifier, 10);
  if (!isNaN(numericId) && String(numericId) === String(identifier).trim()) {
    return { id: numericId };
  }
  return { code: String(identifier).trim() };
};

/**
 * Helper to fetch staff lookup condition
 */
const buildStaffLookup = (identifier) => {
  const num = parseInt(identifier, 10);
  if (!isNaN(num) && String(num) === String(identifier).trim()) {
    return { id: num };
  }
  return { staffId: String(identifier).trim() };
};

/**
 * Helper to fetch enquiry lookup condition (by numeric ID or code)
 */
const buildEnquiryLookup = (identifier) => {
  const num = parseInt(identifier, 10);
  if (!isNaN(num) && String(num) === String(identifier).trim()) {
    return { id: num };
  }
  return { code: String(identifier).trim() };
};

// =========================================================================
// 1. CLIENT BOOKING FLOW
// =========================================================================

/**
 * Client Creates a Booking Request
 * POST /api/v1/client/bookings
 */
const createClientBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const body = req.body || {};
    const {
      service: legacyService,
      serviceId: directServiceId,
      category: legacyCategory,
      categoryId: directCategoryId,
      plan,
      patientName,
      patientAge,
      patientGender,
      relation,
      city,
      area,
      address,
      date,
      time,
      notes,
      source,
    } = body;

    const serviceInput = (directServiceId || legacyService || "").toString().trim();
    const categoryInput = (directCategoryId || legacyCategory || "").toString().trim();

    // Get client identity from authenticated token or payload
    const clientName = (req.user?.name || req.body.clientName || "").trim();
    const clientPhone = (req.user?.phone || req.body.clientPhone || "").trim();
    const clientId = req.user?.id || req.body.clientId || null;

    // Validation
    if (!clientName || !clientPhone) {
      await transaction.rollback();
      return errorResponse(res, "Client name and a valid phone number are required.", 400);
    }
    if (!patientName || !patientName.trim()) {
      await transaction.rollback();
      return errorResponse(res, "Patient name is required.", 400);
    }
    if (!serviceInput) {
      await transaction.rollback();
      return errorResponse(res, "Service selection ('serviceId' or 'service') is required.", 400);
    }
    if (!categoryInput) {
      await transaction.rollback();
      return errorResponse(res, "Category selection ('categoryId' or 'category') is required.", 400);
    }
    if (!address || !address.trim()) {
      await transaction.rollback();
      return errorResponse(res, "Visit address is required.", 400);
    }
    if (!date || !time) {
      await transaction.rollback();
      return errorResponse(res, "Start date and preferred time are required.", 400);
    }

    const bookingCity = (city || req.user?.city || "mumbai").toLowerCase().trim();

    // Fetch service details for tasks and price
    const isServiceNumeric = !isNaN(Number(serviceInput)) && /^\d+$/.test(serviceInput);
    const serviceWhere = isServiceNumeric
      ? { [Op.or]: [{ id: Number(serviceInput) }, { serviceId: serviceInput }, { code: serviceInput }] }
      : { [Op.or]: [{ serviceId: serviceInput }, { name: serviceInput }, { code: serviceInput }] };

    const serviceRecord = await Service.findOne({
      where: serviceWhere,
      transaction,
    });

    const finalServiceId = serviceRecord?.serviceId || serviceInput;
    const finalServiceName = serviceRecord?.name || serviceInput;
    const finalCategoryId = directCategoryId || serviceRecord?.category || categoryInput;
    const finalCategory = serviceRecord?.categoryName || serviceRecord?.category || categoryInput;
    const servicePrice = serviceRecord ? Number(serviceRecord.price) : 0.0;

    // Initialize default tasks for the visit from the service catalog
    const initialTasks = Array.isArray(serviceRecord?.tasks)
      ? serviceRecord.tasks.map((taskLabel) => ({
          label: typeof taskLabel === "string" ? taskLabel : taskLabel.label || "Care task",
          done: false,
        }))
      : [];

    // Generate unique Booking Code
    const bookingCode = await generateBookingId(clientName, bookingCity, transaction);

    const now = new Date();
    const initialHistory = [
      {
        status: "requested",
        at: now.toISOString(),
        by: "client",
        note: "Booking request created by client",
      },
    ];

    const newBooking = await Booking.create(
      {
        code: bookingCode,
        clientId,
        clientName,
        clientPhone,
        patientName: patientName.trim(),
        patientAge: patientAge ? String(patientAge).trim() : null,
        patientGender: patientGender || null,
        relation: relation || "Mother",
        serviceId: finalServiceId,
        service: finalServiceId,
        serviceName: finalServiceName,
        categoryId: finalCategoryId,
        category: finalCategory,
        plan: plan || "Single visit",
        city: bookingCity,
        area: area ? area.trim() : null,
        address: address.trim(),
        date: String(date).trim(),
        time: String(time).trim(),
        status: "requested",
        staffId: null,
        source: source || "App",
        notes: notes ? notes.trim() : null,
        price: servicePrice,
        tasks: initialTasks,
        visit: {},
        history: initialHistory,
        confirmedBy: null,
        confirmedAt: null,
        assignedBy: null,
        assignedAt: null,
      },
      { transaction }
    );

    await transaction.commit();

    return successResponse(
      res,
      {
        booking: newBooking,
        notification: {
          client: {
            title: "Request received",
            body: `We'll confirm your ${finalServiceName} booking ${bookingCode} shortly.`,
          },
          admin: {
            title: `New request ${bookingCode}`,
            body: `${clientName} booked ${finalServiceName} for ${patientName.trim()} in ${bookingCity} · ${date}, ${time}`,
          },
        },
      },
      "Booking request submitted successfully. Care desk will confirm shortly.",
      201
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to create booking request", 500, error);
  }
};

/**
 * Get Client's Bookings List
 * GET /api/v1/client/bookings
 */
const getClientBookings = async (req, res) => {
  try {
    const clientPhone = req.user?.phone || req.query.phone || "";
    const clientId = req.user?.id || req.query.clientId || null;

    if (!clientPhone && !clientId) {
      return errorResponse(res, "Authentication or client phone is required to view bookings", 400);
    }

    const where = {};
    if (clientPhone) {
      where.clientPhone = clientPhone;
    } else if (clientId) {
      where.clientId = clientId;
    }

    const bookings = await Booking.findAll({
      where,
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          attributes: ["id", "staffId", "qualification", "city", "area", "docs", "onDuty"],
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "phone", "email"],
            },
          ],
        },
      ],
      order: [
        ["date", "DESC"],
        ["time", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    return successResponse(res, bookings, "Client bookings retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve bookings", 500, error);
  }
};

/**
 * Get Client Booking Details by ID or Code
 * GET /api/v1/client/bookings/:id
 */
const getClientBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, "Booking identifier is required", 400);
    }

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          attributes: ["id", "staffId", "qualification", "city", "area", "docs", "onDuty"],
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "phone", "email"],
            },
          ],
        },
      ],
    });

    if (!booking) {
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    // Prepare staff assignment info for client display
    let staffAssignmentNotice = null;
    let assignedStaffData = null;

    if (booking.assignedStaff) {
      const staffUser = booking.assignedStaff.user;
      const staffName = staffUser?.name || booking.assignedStaff.staffId;
      const staffPhone = staffUser?.phone || "";
      const staffRole = booking.assignedStaff.qualification || "Caregiver";

      assignedStaffData = {
        staffId: booking.assignedStaff.staffId,
        name: staffName,
        phone: staffPhone,
        role: staffRole,
        city: booking.assignedStaff.city,
        area: booking.assignedStaff.area,
        isVerified: booking.assignedStaff.docs === "verified",
      };

      staffAssignmentNotice = `${staffName} (${staffRole}) will visit ${booking.patientName} ${formatNotificationDate(
        booking.date,
        booking.time
      )}.`;
    }

    return successResponse(
      res,
      {
        booking,
        assignedStaff: assignedStaffData,
        assignmentNotice: staffAssignmentNotice,
      },
      "Booking details retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve booking details", 500, error);
  }
};

/**
 * View Status of Created Booking (Client Side)
 * Returns visual progress tracker, status badge, assigned caregiver card, visit vitals, and timeline
 * GET /api/v1/client/bookings/:id/status
 * GET /api/v1/client/booking/:id/status
 * GET /api/v1/client/booking/:id/track
 */
const getClientBookingStatus = async (req, res) => {
  try {
    let lookupId = req.params.id || req.query.id || "my";
    if (String(lookupId).trim() === ":id" || String(lookupId).trim() === "{id}") {
      lookupId = "my";
    }

    let bookingLookup = null;
    const isKeyword = ["active", "current", "latest", "my"].includes(String(lookupId).toLowerCase().trim());

    if (isKeyword) {
      // Find the latest booking created by this authenticated client
      const userPhone = req.user?.phone ? String(req.user.phone).trim() : null;
      const userId = req.user?.id ? String(req.user.id) : null;
      const clientWhere = {};
      if (userPhone && userId) {
        clientWhere[Op.or] = [{ clientPhone: userPhone }, { clientId: userId }];
      } else if (userPhone) {
        clientWhere.clientPhone = userPhone;
      } else if (userId) {
        clientWhere.clientId = userId;
      }

      // If client has bookings, lookup the latest; otherwise fallback to latest booking
      if (Object.keys(clientWhere).length > 0) {
        bookingLookup = clientWhere;
      } else {
        bookingLookup = {};
      }
    } else {
      bookingLookup = buildBookingLookup(lookupId);
    }

    const booking = await Booking.findOne({
      where: bookingLookup,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          attributes: ["id", "staffId", "qualification", "city", "area", "docs", "files", "onDuty"],
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "phone", "email"],
            },
          ],
        },
      ],
    });

    if (!booking) {
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    // Determine ownership flag without blocking valid authenticated users
    let isMyBooking = true;
    if (req.user && req.user.role === "client") {
      const userPhone = req.user.phone ? String(req.user.phone).replace(/\D/g, "") : "";
      const bookingPhone = booking.clientPhone ? String(booking.clientPhone).replace(/\D/g, "") : "";
      const isOwnerPhone =
        userPhone &&
        bookingPhone &&
        (userPhone.endsWith(bookingPhone) || bookingPhone.endsWith(userPhone));
      const isOwnerId =
        req.user.id && booking.clientId && String(req.user.id) === String(booking.clientId);
      isMyBooking = Boolean(isOwnerPhone || isOwnerId);
    }

    // Status metadata mapping
    const statusMeta = {
      requested: {
        badge: "p-warn",
        color: "amber",
        label: "Requested",
        stepIndex: 1,
        title: "Booking Request Received",
        description: `Your care request for ${booking.patientName} has been received. Our care desk will confirm availability shortly.`,
      },
      confirmed: {
        badge: "p-info",
        color: "blue",
        label: "Confirmed",
        stepIndex: 2,
        title: "Booking Confirmed",
        description: `Your appointment for ${booking.patientName} is confirmed for ${booking.date} at ${booking.time}. Caregiver matching is in progress.`,
      },
      assigned: {
        badge: "p-purple",
        color: "purple",
        label: "Caregiver Assigned",
        stepIndex: 3,
        title: "Caregiver Assigned",
        description: `${booking.assignedStaff?.user?.name || booking.staffId || "A caregiver"} (${booking.assignedStaff?.qualification || "Caregiver"}) will visit ${booking.patientName} ${formatNotificationDate(booking.date, booking.time)}.`,
      },
      on_the_way: {
        badge: "p-indigo",
        color: "indigo",
        label: "On The Way",
        stepIndex: 4,
        title: "Caregiver On The Way",
        description: `${booking.assignedStaff?.user?.name || "Caregiver"} is traveling to your location (${booking.address}). Please keep the patient area ready.`,
      },
      in_progress: {
        badge: "p-teal",
        color: "teal",
        label: "In Progress",
        stepIndex: 5,
        title: "Care Visit In Progress",
        description: `${booking.assignedStaff?.user?.name || "Caregiver"} has checked in and started the visit. Vitals and care checklist are being recorded.`,
      },
      completed: {
        badge: "p-ok",
        color: "emerald",
        label: "Completed",
        stepIndex: 6,
        title: "Visit Completed",
        description: `Care session for ${booking.patientName} has been completed successfully. Summary and vitals recorded are available below.`,
      },
      cancelled: {
        badge: "p-err",
        color: "red",
        label: "Cancelled",
        stepIndex: 0,
        title: "Booking Cancelled",
        description: `This booking has been cancelled.${booking.notes ? ` Reason: ${booking.notes}` : ""}`,
      },
    };

    const currentMeta = statusMeta[booking.status] || {
      badge: "p-warn",
      color: "gray",
      label: booking.status,
      stepIndex: 1,
      title: `Status: ${booking.status}`,
      description: `Current status is ${booking.status}`,
    };

    // Standard workflow steps
    const standardSteps = [
      { key: "requested", title: "Request Placed", description: "Booking request received" },
      { key: "confirmed", title: "Confirmed", description: "Schedule confirmed by care desk" },
      { key: "assigned", title: "Caregiver Assigned", description: "Staff assigned to visit" },
      { key: "on_the_way", title: "On The Way", description: "Caregiver traveling to home" },
      { key: "in_progress", title: "Visit Started", description: "Caregiver arrived and checked in" },
      { key: "completed", title: "Completed", description: "Visit care completed" },
    ];

    const currentStepIndex = currentMeta.stepIndex;
    const isCancelled = booking.status === "cancelled";

    // Build timeline events from booking history & current state
    const historyList = Array.isArray(booking.history) ? booking.history : [];
    const historyMap = {};
    historyList.forEach((h) => {
      if (h && h.status) {
        historyMap[h.status] = h;
      }
    });

    const timeline = standardSteps.map((step, idx) => {
      const stepNum = idx + 1;
      const isPast = !isCancelled && stepNum < currentStepIndex;
      const isCurrent = !isCancelled && stepNum === currentStepIndex;
      const historyEntry = historyMap[step.key];

      let timestamp = historyEntry?.at || null;
      if (!timestamp) {
        if (step.key === "requested") timestamp = booking.createdAt;
        if (step.key === "confirmed") timestamp = booking.confirmedAt;
        if (step.key === "assigned") timestamp = booking.assignedAt;
        if (step.key === "in_progress") timestamp = booking.checkInAt;
        if (step.key === "completed") timestamp = booking.checkOutAt;
      }

      return {
        key: step.key,
        step: stepNum,
        title: step.title,
        description: step.description,
        status: isCurrent ? "current" : isPast ? "completed" : "pending",
        isCompleted: isPast || isCurrent,
        isCurrent,
        timestamp,
        note: historyEntry?.note || null,
        staffName: historyEntry?.staffName || null,
      };
    });

    // Caregiver presentation info
    let caregiver = null;
    if (booking.assignedStaff) {
      const staffUser = booking.assignedStaff.user;
      const files = booking.assignedStaff.files || {};
      const photoUrl =
        files.photo?.data ||
        files["files.photo"]?.data ||
        files.photo?.url ||
        null;

      caregiver = {
        staffId: booking.assignedStaff.staffId,
        name: staffUser?.name || booking.assignedStaff.staffId,
        phone: staffUser?.phone || null,
        email: staffUser?.email || null,
        role: booking.assignedStaff.qualification || "Caregiver",
        city: booking.assignedStaff.city,
        area: booking.assignedStaff.area,
        photo: photoUrl,
        isVerified: booking.assignedStaff.docs === "verified",
        onDuty: Boolean(booking.assignedStaff.onDuty),
      };
    }

    // Care metrics / visit details
    const visitDetails = {
      checkInAt: booking.checkInAt,
      checkOutAt: booking.checkOutAt,
      durationMinutes: null,
      vitals: booking.visit || {},
      tasks: Array.isArray(booking.tasks) ? booking.tasks : [],
      tasksCompletedCount: Array.isArray(booking.tasks)
        ? booking.tasks.filter((t) => t.done).length
        : 0,
      tasksTotalCount: Array.isArray(booking.tasks) ? booking.tasks.length : 0,
    };

    if (booking.checkInAt && booking.checkOutAt) {
      const start = new Date(booking.checkInAt).getTime();
      const end = new Date(booking.checkOutAt).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        visitDetails.durationMinutes = Math.round((end - start) / 60000);
      }
    } else if (booking.checkInAt && booking.status === "in_progress") {
      const start = new Date(booking.checkInAt).getTime();
      const now = Date.now();
      if (!isNaN(start) && now >= start) {
        visitDetails.durationMinutes = Math.round((now - start) / 60000);
      }
    }

    const responseData = {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      statusBadge: currentMeta.badge,
      statusColor: currentMeta.color,
      statusLabel: currentMeta.label,
      statusTitle: currentMeta.title,
      statusDescription: currentMeta.description,
      isCancelled,
      isMyBooking,
      activeStep: isCancelled ? 0 : currentStepIndex,
      totalSteps: 6,
      progressPercent: isCancelled ? 0 : Math.round((currentStepIndex / 6) * 100),
      timeline,
      caregiver,
      service: {
        serviceId: booking.serviceId || booking.service,
        serviceName: booking.serviceName || booking.service,
        categoryId: booking.categoryId,
        category: booking.category,
        plan: booking.plan,
        price: booking.price,
      },
      patient: {
        name: booking.patientName,
        age: booking.patientAge,
        gender: booking.patientGender,
        relation: booking.relation,
      },
      schedule: {
        date: booking.date,
        time: booking.time,
        formatted: formatNotificationDate(booking.date, booking.time),
      },
      location: {
        city: booking.city,
        area: booking.area,
        address: booking.address,
      },
      visitDetails,
      history: historyList,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };

    return successResponse(res, responseData, "Booking status retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve booking status", 500, error);
  }
};

/**
 * Client Cancels a Booking
 * PATCH /api/v1/client/bookings/:id/cancel
 */
const cancelClientBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, "Booking not found", 404);
    }

    // Guard: Can only cancel if in requested, confirmed, or assigned state
    if (!["requested", "confirmed", "assigned"].includes(booking.status)) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Cannot cancel booking with current status '${booking.status}'. Only pending or scheduled visits can be cancelled.`,
        400
      );
    }

    const now = new Date();
    const cancelItem = {
      status: "cancelled",
      at: now.toISOString(),
      by: "client",
      note: reason || "Cancelled by client",
    };

    const existingHistory = Array.isArray(booking.history) ? booking.history : [];
    const updatedHistory = [...existingHistory, cancelItem];

    await booking.update(
      {
        status: "cancelled",
        history: updatedHistory,
      },
      { transaction }
    );

    await transaction.commit();

    return successResponse(res, booking, "Booking cancelled successfully");
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to cancel booking", 500, error);
  }
};

// =========================================================================
// 2. ADMIN BOOKING FLOW: CONFIRM & ASSIGN STAFF
// =========================================================================

/**
 * Admin Assigns Staff to a Booking (Confirms booking and assigns staff)
 * PATCH /api/v1/admin/bookings/:id/assign
 */
const assignStaffToBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { staffId: staffIdentifier } = req.body;

    if (!staffIdentifier) {
      await transaction.rollback();
      return errorResponse(res, "Staff ID ('staffId') is required to assign staff", 400);
    }

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    if (booking.status === "cancelled") {
      await transaction.rollback();
      return errorResponse(res, "Cannot assign staff to a cancelled booking", 400);
    }

    if (booking.status === "completed") {
      await transaction.rollback();
      return errorResponse(res, "Booking is already completed", 400);
    }

    // Look up staff member (must be approved)
    const staff = await Staff.findOne({
      where: buildStaffLookup(staffIdentifier),
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "phone", "email"],
        },
      ],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, `Staff member '${staffIdentifier}' not found`, 404);
    }

    if (staff.approval !== "approved") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Staff member '${staff.user?.name || staff.staffId}' is not approved yet (status: '${staff.approval}'). Only approved staff can be assigned.`,
        400
      );
    }

    const now = new Date();
    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];

    // Step A: If booking was in 'requested' state, confirm it first
    let confirmedBy = booking.confirmedBy;
    let confirmedAt = booking.confirmedAt;

    if (!existingHistory.some((h) => h.status === "confirmed")) {
      confirmedBy = "admin";
      confirmedAt = now;
      existingHistory.push({
        status: "confirmed",
        at: now.toISOString(),
        by: "admin",
        note: "Booking confirmed by admin upon staff assignment",
      });
    }

    // Step B: Record staff assignment
    existingHistory.push({
      status: "assigned",
      at: now.toISOString(),
      by: "admin",
      staffId: staff.staffId,
      note: `Assigned to ${staff.user?.name || staff.staffId}`,
    });

    // Populate tasks from service if not already present
    let currentTasks = booking.tasks;
    if (!Array.isArray(currentTasks) || currentTasks.length === 0) {
      const svc = await Service.findOne({
        where: {
          [Op.or]: [{ serviceId: booking.service }, { name: booking.service }],
        },
        transaction,
      });
      if (svc && Array.isArray(svc.tasks)) {
        currentTasks = svc.tasks.map((t) => ({
          label: typeof t === "string" ? t : t.label || "Care task",
          done: false,
        }));
      }
    }

    await booking.update(
      {
        staffId: staff.staffId,
        status: "assigned",
        confirmedBy,
        confirmedAt,
        assignedBy: "admin",
        assignedAt: now,
        tasks: currentTasks,
        history: existingHistory,
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch refreshed booking with associations
    const refreshedBooking = await Booking.findOne({
      where: { id: booking.id },
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          include: [{ model: User, as: "user", attributes: ["name", "phone", "email"] }],
        },
      ],
    });

    const staffName = staff.user?.name || staff.staffId;
    const staffRole = staff.qualification || "Caregiver";
    const notificationTimeStr = formatNotificationDate(booking.date, booking.time);

    const notificationPayload = {
      client: {
        to: `client:${booking.clientPhone}`,
        title: "Caregiver assigned",
        body: `${staffName} (${staffRole}) will visit ${booking.patientName} ${notificationTimeStr}.`,
      },
      staff: {
        to: `staff:${staff.staffId}`,
        title: "New visit assigned",
        body: `${booking.patientName} · ${booking.serviceName || booking.service} · ${notificationTimeStr} · ${booking.address}`,
      },
    };

    return successResponse(
      res,
      {
        booking: refreshedBooking,
        notification: notificationPayload,
      },
      `${staffName} assigned successfully to booking ${booking.code}. Client informed.`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to assign staff to booking", 500, error);
  }
};

/**
 * Admin Unassigns Staff from a Booking
 * PATCH /api/v1/admin/bookings/:id/unassign
 */
const unassignStaffFromBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    if (!booking.staffId) {
      await transaction.rollback();
      return errorResponse(res, "Booking does not have any assigned staff member", 400);
    }

    const previousStaffId = booking.staffId;
    const now = new Date();
    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];

    existingHistory.push({
      status: "confirmed",
      at: now.toISOString(),
      by: "admin",
      note: `Staff '${previousStaffId}' unassigned. Returned to open confirmed pool.`,
    });

    await booking.update(
      {
        staffId: null,
        status: "confirmed",
        assignedBy: null,
        assignedAt: null,
        history: existingHistory,
      },
      { transaction }
    );

    await transaction.commit();

    return successResponse(
      res,
      booking,
      `Staff unassigned from booking ${booking.code}. Booking status reset to 'confirmed'.`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to unassign staff from booking", 500, error);
  }
};

/**
 * Admin Confirms a Booking Request (without immediate assignment)
 * PATCH /api/v1/admin/bookings/:id/confirm
 */
const confirmBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    if (booking.status !== "requested") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Cannot confirm booking with status '${booking.status}'. Only 'requested' bookings can be confirmed.`,
        400
      );
    }

    const now = new Date();
    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];
    existingHistory.push({
      status: "confirmed",
      at: now.toISOString(),
      by: "admin",
      note: "Booking confirmed by care desk",
    });

    await booking.update(
      {
        status: "confirmed",
        confirmedBy: "admin",
        confirmedAt: now,
        history: existingHistory,
      },
      { transaction }
    );

    await transaction.commit();

    return successResponse(
      res,
      {
        booking,
        notification: {
          client: {
            title: "Booking confirmed",
            body: `Your ${booking.serviceName || booking.service} booking ${booking.code} is confirmed for ${booking.date}, ${booking.time}. A caregiver will be assigned shortly.`,
          },
        },
      },
      `Booking ${booking.code} confirmed successfully`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to confirm booking", 500, error);
  }
};

/**
 * Admin Updates Booking Status along the workflow
 * Transitions: on_the_way -> in_progress -> completed -> cancelled
 * PATCH /api/v1/admin/bookings/:id/status
 */
const updateBookingStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status: nextStatus, note, visit, tasks, cancelReason } = req.body;

    const validStatuses = ["requested", "confirmed", "assigned", "on_the_way", "in_progress", "completed", "cancelled"];
    if (!nextStatus || !validStatuses.includes(nextStatus)) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Valid 'status' is required. Allowed values: ${validStatuses.join(", ")}`,
        400
      );
    }

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    const now = new Date();
    const updates = { status: nextStatus };

    if (nextStatus === "in_progress" && !booking.checkInAt) {
      updates.checkInAt = now;
    }
    if (nextStatus === "completed" && !booking.checkOutAt) {
      updates.checkOutAt = now;
    }
    if (visit && typeof visit === "object") {
      updates.visit = { ...(booking.visit || {}), ...visit };
    }
    if (Array.isArray(tasks)) {
      updates.tasks = tasks;
    }

    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];
    existingHistory.push({
      status: nextStatus,
      at: now.toISOString(),
      by: req.user?.role || "admin",
      note: note || (nextStatus === "cancelled" ? cancelReason || "Cancelled by admin" : `Status updated to ${nextStatus}`),
    });
    updates.history = existingHistory;

    await booking.update(updates, { transaction });
    await transaction.commit();

    return successResponse(
      res,
      booking,
      `Booking ${booking.code} status updated to '${nextStatus}' successfully`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to update booking status", 500, error);
  }
};

/**
 * Admin: Get Available Staff for Booking Assignment
 * GET /api/v1/admin/bookings/:id/available-staff
 * GET /api/v1/admin/booking/:id/available-staff
 *
 * Query Options:
 * - increaseArea=true (or increase_area=true, expandArea=true, note="increase area true"):
 *   Expands the search area by 10 km (or custom radius) beyond exact area matching.
 * - radius=10 (optional, default 10 km when increaseArea=true)
 * - includePending=true (optional, include staff under review / pending approval)
 */
const getAvailableStaffForBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
    });

    if (!booking) {
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    // Parse area expansion flags (from query params, body or note)
    const rawNote = String(req.query.note || req.body?.note || "").toLowerCase();
    const hasIncreaseNote =
      rawNote.includes("increase area") ||
      rawNote.includes("increase_area") ||
      rawNote.includes("expand area") ||
      rawNote.includes("10 km") ||
      rawNote.includes("10km");

    const shouldIncreaseArea =
      req.query.increaseArea === "true" ||
      req.query.increaseArea === "1" ||
      req.query.increaseArea === true ||
      req.query.increase_area === "true" ||
      req.query.increase_area === "1" ||
      req.query.expandArea === "true" ||
      req.query.expand === "true" ||
      req.body?.increaseArea === true ||
      req.body?.increase_area === true ||
      hasIncreaseNote ||
      (req.query.radius && Number(req.query.radius) >= 10);

    const radiusKm = Number(req.query.radius) || 10;
    const includePending =
      req.query.includePending === "true" ||
      req.query.includeAll === "true";

    const staffWhere = includePending ? {} : { approval: "approved" };

    // Fetch staff records with user information
    const staffList = await Staff.findAll({
      where: staffWhere,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "phone", "email"],
        },
      ],
      order: [
        ["city", "ASC"],
        ["onDuty", "DESC"],
      ],
    });

    // Score and rank staff based on city, area, 10km proximity, and required service skills
    const matchingResult = scoreAndRankStaffForBooking(booking, staffList, {
      increaseArea: shouldIncreaseArea,
      radius: radiusKm,
      includePending,
    });

    return successResponse(
      res,
      {
        booking: matchingResult.bookingDetails,
        searchCriteria: {
          ...matchingResult.searchCriteria,
          note: req.query.note || (shouldIncreaseArea ? "Search radius expanded by 10 km" : "Exact area match primary"),
        },
        counts: matchingResult.counts,
        matches: matchingResult.matches,
      },
      shouldIncreaseArea
        ? `Found ${matchingResult.counts.bestMatchesCount} matching staff within expanded 10 km radius in ${booking.city || "Mumbai"}`
        : `Found ${matchingResult.counts.bestMatchesCount} pixel-perfect matching staff in ${booking.area || "local area"}, ${booking.city || "Mumbai"}`
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve available staff", 500, error);
  }
};

/**
 * Admin Creates a Direct Booking (e.g. from Call, WhatsApp, App, or Walk-in)
 * Matches admin dashboard payload from NewBooking.jsx
 * POST /api/v1/admin/booking/create (aliases: /api/v1/admin/bookings, /api/v1/admin/bookings/create)
 */
const createAdminBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const body = req.body || {};
    const {
      clientName,
      clientPhone,
      patientName,
      patientAge,
      patientGender,
      relation,
      service: legacyService,
      serviceId: directServiceId,
      category: legacyCategory,
      categoryId: directCategoryId,
      plan,
      city,
      area,
      address,
      date,
      time,
      notes,
      careNotes,
      description,
      source,
      staffId: staffIdentifier,
      price,
      tasks,
      fromEnqId,
      enquiryId,
      fromEnq,
    } = body;

    const trimmedClientName = (clientName || "").trim();
    const trimmedPatientName = (patientName || "").trim();
    const trimmedAddress = (address || "").trim();
    const serviceInput = (directServiceId || legacyService || "").toString().trim();
    const categoryInput = (directCategoryId || legacyCategory || "").toString().trim();
    const noteContent = (careNotes || notes || description || "").trim() || null;

    // Normalize phone number to 10 digits
    const rawPhone = String(clientPhone || "").replace(/[^\d]/g, "");
    const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

    // Validation matching frontend form requirements
    if (!trimmedClientName) {
      await transaction.rollback();
      return errorResponse(res, "Client name is required.", 400);
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      await transaction.rollback();
      return errorResponse(
        res,
        "A valid 10-digit mobile number is required.",
        400
      );
    }
    if (!trimmedPatientName) {
      await transaction.rollback();
      return errorResponse(res, "Patient name is required.", 400);
    }
    if (!serviceInput) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Service selection ('service' or 'serviceId') is required.",
        400
      );
    }
    if (!trimmedAddress) {
      await transaction.rollback();
      return errorResponse(res, "Visit address is required.", 400);
    }
    if (!date || !time) {
      await transaction.rollback();
      return errorResponse(res, "Date and preferred time are required.", 400);
    }

    const bookingCity = (city || "mumbai").toLowerCase().trim();

    // Fetch service details for pricing, categories, and checklist tasks
    const isServiceNumeric = !isNaN(Number(serviceInput)) && /^\d+$/.test(serviceInput);
    const serviceWhere = isServiceNumeric
      ? { [Op.or]: [{ id: Number(serviceInput) }, { serviceId: serviceInput }, { code: serviceInput }] }
      : { [Op.or]: [{ serviceId: serviceInput }, { name: serviceInput }, { code: serviceInput }] };

    const serviceRecord = await Service.findOne({
      where: serviceWhere,
      transaction,
    });

    const finalServiceId = serviceRecord?.serviceId || serviceInput;
    const finalServiceName = serviceRecord?.name || serviceInput;
    const finalCategoryId = directCategoryId || serviceRecord?.category || categoryInput || null;
    const finalCategory = serviceRecord?.categoryName || serviceRecord?.category || categoryInput || null;
    const servicePrice = price !== undefined && price !== null
      ? Number(price)
      : (serviceRecord ? Number(serviceRecord.price || 0) : 0.0);

    // Initial tasks checklist: prefer passed tasks, or service catalog defaults
    let initialTasks = [];
    if (Array.isArray(tasks) && tasks.length > 0) {
      initialTasks = tasks.map((t) =>
        typeof t === "string"
          ? { label: t, done: false }
          : { label: t.label || "Care task", done: Boolean(t.done) }
      );
    } else if (Array.isArray(serviceRecord?.tasks) && serviceRecord.tasks.length > 0) {
      initialTasks = serviceRecord.tasks.map((taskLabel) => ({
        label: typeof taskLabel === "string" ? taskLabel : taskLabel.label || "Care task",
        done: false,
      }));
    }

    // Automatically link or provision client user account
    let finalClientId = null;
    let clientUser = await User.findOne({
      where: { phone: cleanPhone },
      include: [{ model: Client, as: "clientProfile", required: false }],
      transaction,
    });

    if (clientUser) {
      finalClientId = clientUser.clientProfile?.clientId || `c_${clientUser.id}`;
      if (clientUser.clientProfile) {
        const profileUpdates = {};
        if (!clientUser.clientProfile.address && trimmedAddress) profileUpdates.address = trimmedAddress;
        if (!clientUser.clientProfile.patientName && trimmedPatientName) profileUpdates.patientName = trimmedPatientName;
        if (!clientUser.clientProfile.patientAge && patientAge) profileUpdates.patientAge = String(patientAge).trim();
        if (Object.keys(profileUpdates).length > 0) {
          await clientUser.clientProfile.update(profileUpdates, { transaction });
        }
      }
    } else {
      try {
        const generatedClientId = await generateClientId(bookingCity, transaction);
        clientUser = await User.create(
          {
            name: trimmedClientName,
            phone: cleanPhone,
            role: "client",
            isActive: true,
          },
          { transaction }
        );

        const newClientProfile = await Client.create(
          {
            userId: clientUser.id,
            clientId: generatedClientId,
            city: bookingCity,
            area: area ? area.trim() : null,
            address: trimmedAddress,
            patientName: trimmedPatientName,
            patientAge: patientAge ? String(patientAge).trim() : null,
            patientGender: patientGender || null,
            relation: relation || "Mother",
            status: "active",
          },
          { transaction }
        );

        finalClientId = newClientProfile.clientId || generatedClientId;
      } catch (clientErr) {
        console.warn("Client account auto-provisioning note:", clientErr.message);
        finalClientId = null;
      }
    }

    const adminActor = req.user?.name || req.user?.email || "admin";
    const bookingCode = await generateBookingId(trimmedClientName, bookingCity, transaction);
    const now = new Date();

    let initialStatus = "confirmed";
    let assignedStaffId = null;
    let assignedStaffName = null;
    let assignedBy = null;
    let assignedAt = null;

    const initialHistory = [
      {
        status: "requested",
        at: now.toISOString(),
        by: adminActor,
        note: `Booking created by care desk (${adminActor})`,
      },
      {
        status: "confirmed",
        at: now.toISOString(),
        by: adminActor,
        note: `Confirmed by care desk (${adminActor})`,
      },
    ];

    // Optional direct staff assignment on booking creation
    if (staffIdentifier) {
      const staff = await Staff.findOne({
        where: buildStaffLookup(staffIdentifier),
        include: [{ model: User, as: "user", required: false }],
        transaction,
      });

      if (staff && staff.approval === "approved") {
        initialStatus = "assigned";
        assignedStaffId = staff.staffId;
        assignedStaffName = staff.user?.name || staff.staffId;
        assignedBy = adminActor;
        assignedAt = now;
        initialHistory.push({
          status: "assigned",
          at: now.toISOString(),
          by: adminActor,
          staffId: staff.staffId,
          note: `Caregiver ${staff.staffId} assigned by ${adminActor}`,
        });
      }
    }

    // Create the confirmed Booking
    const newBooking = await Booking.create(
      {
        code: bookingCode,
        clientId: finalClientId,
        clientName: trimmedClientName,
        clientPhone: cleanPhone,
        patientName: trimmedPatientName,
        patientAge: patientAge ? String(patientAge).trim() : null,
        patientGender: patientGender || null,
        relation: relation || "Mother",
        serviceId: finalServiceId,
        service: finalServiceId,
        serviceName: finalServiceName,
        categoryId: finalCategoryId,
        category: finalCategory,
        plan: plan || "Single visit",
        city: bookingCity,
        area: area ? area.trim() : null,
        address: trimmedAddress,
        date: String(date).trim(),
        time: String(time).trim(),
        status: initialStatus,
        staffId: assignedStaffId,
        source: source || "Call",
        notes: noteContent,
        price: servicePrice,
        tasks: initialTasks,
        visit: {},
        history: initialHistory,
        confirmedBy: adminActor,
        confirmedAt: now,
        assignedBy,
        assignedAt,
      },
      { transaction }
    );

    // If converted from an existing Enquiry / help request, update Enquiry state
    const targetEnqId = fromEnqId || enquiryId || fromEnq;
    let convertedEnquiry = null;

    if (targetEnqId) {
      const enqLookup = buildEnquiryLookup(targetEnqId);
      const enquiryRecord = await Enquiry.findOne({
        where: enqLookup,
        transaction,
      });

      if (enquiryRecord) {
        const enqHistory = Array.isArray(enquiryRecord.history)
          ? [...enquiryRecord.history]
          : [];

        enqHistory.push({
          status: "converted",
          at: now.toISOString(),
          by: adminActor,
          note: `Booking ${bookingCode} created by care desk`,
        });

        await enquiryRecord.update(
          {
            status: "converted",
            recommended: finalServiceId,
            adminNote: enquiryRecord.adminNote
              ? `${enquiryRecord.adminNote}\n[Converted to booking ${bookingCode}]`
              : `Converted to booking ${bookingCode}`,
            history: enqHistory,
          },
          { transaction }
        );

        convertedEnquiry = {
          id: enquiryRecord.id,
          code: enquiryRecord.code,
          status: "converted",
        };
      }
    }

    await transaction.commit();

    // Fetch refreshed booking with assigned staff details
    const createdBooking = await Booking.findOne({
      where: { id: newBooking.id },
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          attributes: ["id", "staffId", "qualification", "city", "area", "onDuty", "approval"],
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email", "phone"],
              required: false,
            },
          ],
        },
      ],
    });

    const formattedTimeNotice = formatNotificationDate(String(date).trim(), String(time).trim());

    return successResponse(
      res,
      {
        booking: createdBooking || newBooking,
        convertedEnquiry,
        notification: {
          client: {
            to: `client:${cleanPhone}`,
            title: "Booking confirmed",
            body: `Your ${finalServiceName} booking ${bookingCode} is confirmed ${formattedTimeNotice}.`,
          },
          admin: {
            title: `New booking ${bookingCode}`,
            body: `${trimmedClientName} booked ${finalServiceName} for ${trimmedPatientName} in ${bookingCity} · ${date}, ${time}`,
          },
          staff: assignedStaffId
            ? {
                to: `staff:${assignedStaffId}`,
                title: `Assigned to visit ${bookingCode}`,
                body: `You are assigned to ${finalServiceName} for ${trimmedPatientName} ${formattedTimeNotice}.`,
              }
            : {
                city: bookingCity,
                title: `Open visit ${bookingCode}`,
                body: `${finalServiceName} for ${trimmedPatientName} · ${date}, ${time} · needs caregiver`,
              },
        },
      },
      `Booking ${bookingCode} created and confirmed successfully`,
      201
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to create booking", 500, error);
  }
};

/**
 * 3. STAFF VISITS FLOW
 * Get assigned bookings for the logged-in staff member
 * GET /api/v1/staff/bookings
 */
const getStaffBookings = async (req, res) => {
  try {
    let staffId = req.user?.staffId;
    if (!staffId && req.user?.id) {
      const staffRecord = await Staff.findOne({ where: { userId: req.user.id } });
      staffId = staffRecord?.staffId;
    }
    if (!staffId && req.query.staffId) {
      staffId = req.query.staffId;
    }

    if (!staffId) {
      return errorResponse(res, "Staff identifier is required", 400);
    }

    const { status, date } = req.query;
    const where = { staffId };
    if (status && status !== "all") {
      where.status = status;
    }
    if (date) {
      where.date = date;
    }

    const bookings = await Booking.findAll({
      where,
      order: [
        ["date", "ASC"],
        ["time", "ASC"],
      ],
    });

    return successResponse(res, bookings, "Assigned visits retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve assigned visits", 500, error);
  }
};

/**
 * Get single assigned visit for staff
 * GET /api/v1/staff/bookings/:id
 */
const getStaffBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
    });

    if (!booking) {
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    return successResponse(res, booking, "Visit details retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve visit details", 500, error);
  }
};

/**
 * Update Status of Assigned Booking (Staff Side)
 * Restricts updates ONLY to visits assigned to the requesting caregiver.
 * Allowed transitions: on_the_way -> in_progress -> completed -> cancelled
 * PATCH /api/v1/staff/bookings/:id/status
 * PATCH /api/v1/staff/booking/:id/status
 */
const updateStaffAssignedBookingStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status: nextStatus, note, visit, tasks, cancelReason } = req.body;

    // 1. Resolve staffId from token, headers, body, or query
    let staffId = req.user?.staffId;
    if (!staffId && req.user?.id) {
      const staffRecord = await Staff.findOne({ where: { userId: req.user.id }, transaction });
      staffId = staffRecord?.staffId;
    }
    if (!staffId && (req.headers["x-staff-id"] || req.headers["staffid"])) {
      staffId = req.headers["x-staff-id"] || req.headers["staffid"];
    }
    if (!staffId && req.body?.staffId) {
      staffId = req.body.staffId;
    }
    if (!staffId && req.query?.staffId) {
      staffId = req.query.staffId;
    }

    if (!staffId) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Staff authentication or staffId is required to update visit status",
        401
      );
    }

    // 2. Fetch staff record to get name and confirm validity
    const staff = await Staff.findOne({
      where: { staffId: String(staffId).trim() },
      include: [{ model: User, as: "user", attributes: ["id", "name", "phone", "email"] }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, `Staff member with ID '${staffId}' not found`, 404);
    }

    // 3. Validate status requested by staff
    const allowedStaffStatuses = ["on_the_way", "in_progress", "completed", "cancelled"];
    if (!nextStatus || !allowedStaffStatuses.includes(nextStatus)) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Invalid status '${nextStatus}'. Staff can only set: ${allowedStaffStatuses.join(", ")}`,
        400
      );
    }

    // 4. Fetch the booking
    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    // 5. CRITICAL AUTHORIZATION CHECK: Is this booking assigned to this staff member?
    if (!booking.staffId) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Booking ${booking.code} has not been assigned to any caregiver yet. Only assigned caregivers can update visit status.`,
        400
      );
    }

    if (String(booking.staffId).trim() !== String(staff.staffId).trim()) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Unauthorized: You can only update visits assigned to you. This visit is assigned to '${booking.staffId}'.`,
        403
      );
    }

    // Prevent changing completed or cancelled visits unless updating vitals/tasks
    if (booking.status === "completed" && nextStatus !== "completed") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Visit ${booking.code} is already completed and cannot be reopened.`,
        400
      );
    }
    if (booking.status === "cancelled") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Visit ${booking.code} has been cancelled and cannot be updated.`,
        400
      );
    }

    // 6. Prepare updates
    const now = new Date();
    const updates = { status: nextStatus };

    if (nextStatus === "in_progress" && !booking.checkInAt) {
      updates.checkInAt = now;
    }
    if (nextStatus === "completed") {
      if (!booking.checkOutAt) {
        updates.checkOutAt = now;
      }
      if (!booking.checkInAt) {
        updates.checkInAt = booking.assignedAt || now;
      }
    }

    if (visit && typeof visit === "object") {
      updates.visit = { ...(booking.visit || {}), ...visit };
    }
    if (Array.isArray(tasks)) {
      updates.tasks = tasks;
    }

    const staffName = staff.user?.name || staff.staffId;
    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];
    existingHistory.push({
      status: nextStatus,
      at: now.toISOString(),
      by: `staff:${staff.staffId}`,
      staffName,
      note:
        note ||
        (nextStatus === "cancelled"
          ? cancelReason || "Visit cancelled by caregiver"
          : `Caregiver ${staffName} updated status to ${nextStatus}`),
    });
    updates.history = existingHistory;

    await booking.update(updates, { transaction });
    await transaction.commit();

    // 7. Refetch refreshed booking with staff details
    const refreshedBooking = await Booking.findOne({
      where: { id: booking.id },
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          include: [{ model: User, as: "user", attributes: ["name", "phone", "email"] }],
        },
      ],
    });

    // 8. Generate notification payload for the client
    const notificationMessages = {
      on_the_way: {
        title: "Caregiver On The Way",
        body: `${staffName} is traveling to your location for ${booking.patientName}'s visit.`,
      },
      in_progress: {
        title: "Caregiver Has Arrived",
        body: `${staffName} has checked in and started the care visit for ${booking.patientName}.`,
      },
      completed: {
        title: "Care Visit Completed",
        body: `${staffName} has completed the visit for ${booking.patientName}. Vitals and summary are ready.`,
      },
      cancelled: {
        title: "Visit Cancelled",
        body: `Caregiver ${staffName} reported an issue: ${cancelReason || note || "Visit could not be completed."}`,
      },
    };

    const clientNotification = notificationMessages[nextStatus] || {
      title: `Visit Status: ${nextStatus}`,
      body: `Status updated by ${staffName}`,
    };

    return successResponse(
      res,
      {
        booking: refreshedBooking,
        notification: {
          client: {
            to: `client:${booking.clientPhone}`,
            ...clientNotification,
          },
        },
      },
      `Visit ${booking.code} status updated to '${nextStatus}' successfully.`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to update visit status", 500, error);
  }
};

/**
 * Staff Assigns or Reassigns a Visit to a Colleague
 */
const staffAssignColleagueToBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // 1. Permission check: staffCanConfirm must be enabled
    const appSetting = await Setting.findByPk("app", { transaction });
    if (appSetting && appSetting.staffCanConfirm === false) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Staff confirmation and assignment is disabled by administrator.",
        403
      );
    }

    const { id } = req.params;
    const body = req.body || {};
    const colleagueIdentifier =
      body.colleagueId ||
      body.colleagueStaffId ||
      body.targetStaffId ||
      body.staffId;

    if (!colleagueIdentifier) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Colleague staff identifier ('colleagueId' or 'staffId') is required to assign or reassign the visit.",
        400
      );
    }

    // 2. Lookup booking
    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    if (booking.status === "cancelled") {
      await transaction.rollback();
      return errorResponse(res, "Cannot assign or reassign a cancelled booking", 400);
    }

    if (booking.status === "completed") {
      await transaction.rollback();
      return errorResponse(res, "Cannot reassign an already completed booking", 400);
    }

    // 3. Resolve requesting staff member (assigner)
    let assignerStaffId = req.user?.staffId;
    if (!assignerStaffId && req.user?.id) {
      const staffRec = await Staff.findOne({ where: { userId: req.user.id }, transaction });
      assignerStaffId = staffRec?.staffId;
    }
    if (!assignerStaffId && (req.headers["x-staff-id"] || req.headers["staffid"])) {
      assignerStaffId = req.headers["x-staff-id"] || req.headers["staffid"];
    }
    if (!assignerStaffId && (body.fromStaffId || body.currentStaffId || body.assignerStaffId)) {
      assignerStaffId = body.fromStaffId || body.currentStaffId || body.assignerStaffId;
    }
    // If not provided, fallback to current staffId on booking if already assigned
    if (!assignerStaffId && booking.staffId) {
      assignerStaffId = booking.staffId;
    }

    let assigner = null;
    if (assignerStaffId) {
      assigner = await Staff.findOne({
        where: buildStaffLookup(assignerStaffId),
        include: [{ model: User, as: "user", attributes: ["id", "name", "phone", "email"] }],
        transaction,
      });
    }

    // If the booking is already assigned to a staff member, verify authority:
    // Staff can reassign their own assigned visits. If assigned to someone else, check ownership.
    if (booking.staffId && assigner && booking.staffId !== assigner.staffId) {
      await transaction.rollback();
      return errorResponse(
        res,
        `You cannot reassign this visit because it is currently assigned to another staff member (${booking.staffId}).`,
        403
      );
    }

    // 4. Resolve target colleague
    const colleague = await Staff.findOne({
      where: buildStaffLookup(colleagueIdentifier),
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "phone", "email"],
        },
      ],
      transaction,
    });

    if (!colleague) {
      await transaction.rollback();
      return errorResponse(res, `Colleague staff member '${colleagueIdentifier}' not found`, 404);
    }

    if (colleague.approval !== "approved") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Staff member '${colleague.user?.name || colleague.staffId}' is not approved yet (status: '${colleague.approval}'). Only approved staff colleagues can be assigned to visits.`,
        400
      );
    }

    if (booking.staffId && booking.staffId === colleague.staffId) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Visit is already assigned to ${colleague.user?.name || colleague.staffId}.`,
        400
      );
    }

    const prevStaffId = booking.staffId || null;
    const now = new Date();
    const actorTag = assigner ? `staff:${assigner.staffId}` : (prevStaffId ? `staff:${prevStaffId}` : "staff");
    const actorName = assigner?.user?.name || assigner?.staffId || (prevStaffId || "Staff member");

    // 5. Ensure service tasks are populated if empty
    let currentTasks = booking.tasks;
    if (!Array.isArray(currentTasks) || currentTasks.length === 0) {
      const svc = await Service.findOne({
        where: {
          [Op.or]: [{ serviceId: booking.service }, { name: booking.service }],
        },
        transaction,
      });
      if (svc && Array.isArray(svc.tasks)) {
        currentTasks = svc.tasks.map((t) => ({
          label: typeof t === "string" ? t : t.label || "Care task",
          done: false,
        }));
      }
    }

    // 6. Build History Log
    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];
    let confirmedBy = booking.confirmedBy;
    let confirmedAt = booking.confirmedAt;

    if (!existingHistory.some((h) => h.status === "confirmed")) {
      confirmedBy = actorTag;
      confirmedAt = now;
      existingHistory.push({
        status: "confirmed",
        at: now.toISOString(),
        by: actorTag,
        note: `Booking confirmed by staff upon colleague assignment`,
      });
    }

    const assignmentNote = prevStaffId
      ? `${booking.code} reassigned from ${prevStaffId} to ${colleague.user?.name || colleague.staffId} by ${actorName}`
      : `${booking.code} assigned to ${colleague.user?.name || colleague.staffId} by ${actorName}`;

    existingHistory.push({
      status: "assigned",
      at: now.toISOString(),
      by: actorTag,
      staffId: colleague.staffId,
      previousStaffId: prevStaffId,
      note: assignmentNote,
    });

    // 7. Update Booking
    await booking.update(
      {
        staffId: colleague.staffId,
        status: "assigned",
        confirmedBy: confirmedBy || actorTag,
        confirmedAt: confirmedAt || now,
        assignedBy: actorTag,
        assignedAt: now,
        tasks: currentTasks,
        history: existingHistory,
      },
      { transaction }
    );

    await transaction.commit();

    // 8. Refetch with full associations
    const refreshedBooking = await Booking.findOne({
      where: { id: booking.id },
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          include: [{ model: User, as: "user", attributes: ["name", "phone", "email"] }],
        },
      ],
    });

    const colleagueName = colleague.user?.name || colleague.staffId;
    const colleagueRole = colleague.qualification || "Caregiver";
    const notificationTimeStr = formatNotificationDate(booking.date, booking.time);
    const serviceDisplayName = booking.serviceName || booking.service;

    // Notifications structure aligned with index (4).html
    const notifications = {
      colleague: {
        to: `staff:${colleague.staffId}`,
        title: "New visit assigned",
        body: `${booking.patientName} · ${serviceDisplayName} · ${notificationTimeStr} · ${booking.address} · assigned by ${actorName}`,
      },
      client: {
        to: `client:${booking.clientPhone}`,
        title: "Caregiver assigned",
        body: `${colleagueName} (${colleagueRole}) will visit ${booking.patientName} ${notificationTimeStr}.`,
      },
      admin: {
        to: "admin",
        title: `${booking.code} assigned by staff`,
        body: `${actorName} assigned ${colleagueName} to ${booking.patientName}'s ${serviceDisplayName} visit in ${booking.city} · ${notificationTimeStr}.`,
      },
    };

    if (prevStaffId && prevStaffId !== colleague.staffId) {
      notifications.previousStaff = {
        to: `staff:${prevStaffId}`,
        title: "Visit reassigned",
        body: `${booking.patientName} · ${notificationTimeStr} has been given to ${colleagueName}.`,
      };
    }

    return successResponse(
      res,
      {
        booking: refreshedBooking,
        reassignedFrom: prevStaffId,
        assignedTo: {
          staffId: colleague.staffId,
          name: colleagueName,
          phone: colleague.user?.phone || null,
          role: colleagueRole,
        },
        assignedBy: {
          staffId: assigner?.staffId || (prevStaffId || null),
          name: actorName,
        },
        notifications,
      },
      `${colleagueName} has been assigned to visit ${booking.code} successfully.`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to assign visit to colleague", 500, error);
  }
};

module.exports = {
  createClientBooking,
  getClientBookings,
  getClientBookingById,
  getClientBookingStatus,
  cancelClientBooking,
  assignStaffToBooking,
  unassignStaffFromBooking,
  confirmBooking,
  updateBookingStatus,
  getAvailableStaffForBooking,
  createAdminBooking,
  getStaffBookings,
  getStaffBookingById,
  updateStaffAssignedBookingStatus,
  staffAssignColleagueToBooking,
};
