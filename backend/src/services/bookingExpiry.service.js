const { Op } = require("sequelize");
const { Booking, Staff, User, InAppNotification, sequelize } = require("../database/models");

/**
 * Returns today's date formatted as YYYY-MM-DD in Indian Standard Time (Asia/Kolkata)
 */
const getTodayDateStr = () => {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
};

let enumEnsured = false;
/**
 * Idempotently ensure the MySQL ENUM on bookings.status includes 'date_exceeded'
 */
const ensureDateExceededEnum = async () => {
  if (enumEnsured) return;
  try {
    await sequelize.query(`
      ALTER TABLE \`bookings\` MODIFY COLUMN \`status\` ENUM(
        'requested',
        'confirmed',
        'assigned',
        'on_the_way',
        'in_progress',
        'completed',
        'cancelled',
        'date_exceeded'
      ) NOT NULL DEFAULT 'requested';
    `);
    enumEnsured = true;
  } catch (err) {
    // If not MySQL or already modified, ignore silently
    enumEnsured = true;
  }
};

/**
 * Checks for bookings whose scheduled date has passed without any confirmation
 * or staff assignment from admin/staff side, and marks them as 'date_exceeded'.
 *
 * Example:
 * A booking generated on 10/10/2026 for scheduled date 15/10/2026.
 * If today is 16/10/2026 and neither confirmation nor staff assignment took place
 * (status is still 'requested', no staff assigned, no confirmation timestamp),
 * it transitions to 'date_exceeded'.
 *
 * @param {Object} options
 * @param {string} [options.city] - Optional city filter
 * @returns {Promise<{ updatedCount: number, updatedBookings: Array }>}
 */
const checkAndMarkDateExceededBookings = async (options = {}) => {
  try {
    await ensureDateExceededEnum();

    const todayStr = getTodayDateStr();
    const where = {
      date: { [Op.lt]: todayStr },
      status: "requested",
      [Op.or]: [
        { staffId: null },
        { staffId: "" },
      ],
      confirmedAt: null,
    };

    if (options.city && options.city !== "all" && String(options.city).trim()) {
      where.city = { [Op.like]: `%${String(options.city).trim().toLowerCase()}%` };
    }

    const overdueBookings = await Booking.findAll({
      where,
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

    if (overdueBookings.length === 0) {
      return {
        updatedCount: 0,
        updatedBookings: [],
      };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const updatedBookings = [];

    for (const booking of overdueBookings) {
      const history = Array.isArray(booking.history) ? [...booking.history] : [];
      history.push({
        status: "date_exceeded",
        at: nowIso,
        by: "system",
        note: `Booking date (${booking.date}) exceeded: scheduled date passed without confirmation or staff assignment`,
      });

      booking.status = "date_exceeded";
      booking.history = history;
      await booking.save();

      // Send InAppNotification to client if available
      if (booking.clientPhone && InAppNotification) {
        try {
          await InAppNotification.create({
            phone: booking.clientPhone,
            title: "Booking Date Exceeded",
            message: `Your booking (${booking.code}) for ${booking.serviceName || booking.service} scheduled on ${booking.date} could not be confirmed in time. Please reschedule or contact our care desk.`,
            type: "booking_update",
            targetType: "booking",
            targetId: booking.code,
            actionUrl: `/bookings/${booking.code}`,
            icon: "calendar",
          });
        } catch (_) {
          // Notification logging is secondary to status update
        }
      }

      updatedBookings.push(booking);
    }

    return {
      updatedCount: updatedBookings.length,
      updatedBookings,
    };
  } catch (error) {
    console.error("Error in checkAndMarkDateExceededBookings:", error.message);
    throw error;
  }
};

/**
 * Retrieves all bookings whose status is 'date_exceeded',
 * running the expiration check first to ensure real-time freshness.
 */
const getDateExceededBookings = async (options = {}) => {
  // 1. Process any pending date-exceeded bookings
  await checkAndMarkDateExceededBookings(options).catch((err) => {
    console.warn("Date exceeded check in query warning:", err.message);
  });

  const { city, search, page = 1, limit = 100 } = options;
  const where = { status: "date_exceeded" };

  if (city && city !== "all" && String(city).trim()) {
    where.city = { [Op.like]: `%${String(city).trim().toLowerCase()}%` };
  }

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    where[Op.or] = [
      { code: { [Op.like]: term } },
      { clientName: { [Op.like]: term } },
      { clientPhone: { [Op.like]: term } },
      { patientName: { [Op.like]: term } },
      { serviceName: { [Op.like]: term } },
      { address: { [Op.like]: term } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 100);
  const offset = (pageNum - 1) * pageSize;

  const { count, rows } = await Booking.findAndCountAll({
    where,
    order: [
      ["date", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit: pageSize,
    offset,
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

  return {
    total: count,
    page: pageNum,
    limit: pageSize,
    bookings: rows,
  };
};

module.exports = {
  getTodayDateStr,
  checkAndMarkDateExceededBookings,
  getDateExceededBookings,
};
