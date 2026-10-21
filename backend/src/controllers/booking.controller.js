const { Op } = require("sequelize");
const { sequelize, Booking, Staff, User, Service, City, Enquiry, Client, Setting } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");
const { generateBookingId } = require("../helpers/generateBookingID");
const { generateClientId } = require("../helpers/generateClientID");
const { scoreAndRankStaffForBooking } = require("../helpers/staffMatching.helper");
const {
  uploadMedicalFilesToCloudinary,
  uploadVisitReportFilesToCloudinary,
} = require("../services/cloudinary.service");

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

/**
 * Helper to normalize patient vitals (BP, pulse, SpO2, temperature, sugar)
 * Supports flat body fields, nested `vitals` object, or `visit` object.
 */
const normalizeVisitVitals = (body = {}) => {
  let vitals = {};
  if (body.vitals) {
    try {
      vitals = typeof body.vitals === "string" ? JSON.parse(body.vitals) : body.vitals;
    } catch (_) {}
  } else if (body.visit && typeof body.visit === "object") {
    try {
      vitals = typeof body.visit === "string" ? JSON.parse(body.visit) : body.visit;
    } catch (_) {}
  }

  const bp = body.bp || body.bloodPressure || body.BP || vitals.bp || vitals.bloodPressure || vitals.BP || null;
  const pulse = body.pulse || body.heartRate || body.HR || vitals.pulse || vitals.heartRate || vitals.HR || null;
  const spo2 = body.spo2 || body.spO2 || body.SpO2 || body.oxygen || vitals.spo2 || vitals.spO2 || vitals.SpO2 || vitals.oxygen || null;
  const temperature = body.temperature || body.temp || body.Temp || vitals.temperature || vitals.temp || vitals.Temp || null;
  const sugar = body.sugar || body.bloodSugar || body.glucose || vitals.sugar || vitals.bloodSugar || vitals.glucose || null;

  return {
    bp: bp !== null && bp !== undefined ? String(bp).trim() : null,
    pulse: pulse !== null && pulse !== undefined ? String(pulse).trim() : null,
    spo2: spo2 !== null && spo2 !== undefined ? String(spo2).trim() : null,
    temperature: temperature !== null && temperature !== undefined ? String(temperature).trim() : null,
    sugar: sugar !== null && sugar !== undefined ? String(sugar).trim() : null,
    ...vitals,
  };
};

/**
 * Helper to normalize visit tasks completed
 */
const normalizeVisitTasks = (bodyTasks, existingTasks = []) => {
  let rawTasks = bodyTasks;
  if (typeof rawTasks === "string") {
    try {
      rawTasks = JSON.parse(rawTasks);
    } catch (_) {}
  }

  let tasksList = Array.isArray(existingTasks) ? [...existingTasks] : [];

  if (Array.isArray(rawTasks)) {
    if (rawTasks.length > 0 && typeof rawTasks[0] === "string") {
      const doneLabels = new Set(rawTasks.map((s) => s.toLowerCase().trim()));
      tasksList = tasksList.map((t) => {
        const label = typeof t === "string" ? t : t.label || "";
        return {
          label,
          done: doneLabels.has(label.toLowerCase().trim()) ? true : Boolean(t.done),
        };
      });
      rawTasks.forEach((lbl) => {
        if (!tasksList.some((t) => (t.label || "").toLowerCase().trim() === lbl.toLowerCase().trim())) {
          tasksList.push({ label: lbl, done: true });
        }
      });
    } else {
      tasksList = rawTasks.map((t) => ({
        label: typeof t === "string" ? t : t.label || "Care task",
        done: Boolean(t.done),
      }));
    }
  }

  return tasksList;
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

    // Upload patient medical history documents (prescriptions, discharge summaries, reports) to Cloudinary
    const medicalFiles = await uploadMedicalFilesToCloudinary(req, {
      folder: "eldoria/medical_history",
      uploadedBy: "client",
    });

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
        files: medicalFiles,
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
      files: Array.isArray(booking.files) ? booking.files : [],
      reports: Array.isArray(booking.reports) ? booking.reports : [],
      latestReport:
        Array.isArray(booking.reports) && booking.reports.length > 0
          ? booking.reports[booking.reports.length - 1]
          : null,
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

    if (booking.status !== "requested" && booking.status !== "confirmed") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Cannot confirm booking with status '${booking.status}'. Only 'requested' bookings can be confirmed.`,
        400
      );
    }

    const adminActor = req.user?.name || req.user?.email || "admin";
    const now = new Date();
    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];
    if (!existingHistory.some((h) => h.status === "confirmed")) {
      existingHistory.push({
        status: "confirmed",
        at: now.toISOString(),
        by: adminActor,
        note: "Booking confirmed by care desk",
      });
    }

    await booking.update(
      {
        status: "confirmed",
        confirmedBy: adminActor,
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

    // Standard new booking created by care desk always starts as 'requested' (Request received)
    let initialStatus = "requested";
    let assignedStaffId = null;
    let assignedStaffName = null;
    let assignedBy = null;
    let assignedAt = null;
    let confirmedBy = null;
    let confirmedAt = null;

    const initialHistory = [
      {
        status: "requested",
        at: now.toISOString(),
        by: adminActor,
        note: "Booking request created by care desk",
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
        confirmedBy = adminActor;
        confirmedAt = now;
        initialHistory.push({
          status: "confirmed",
          at: now.toISOString(),
          by: adminActor,
          note: "Confirmed by care desk upon staff assignment",
        });
        initialHistory.push({
          status: "assigned",
          at: now.toISOString(),
          by: adminActor,
          staffId: staff.staffId,
          note: `Caregiver ${staff.staffId} assigned by ${adminActor}`,
        });
      }
    }

    // If converted from an existing Enquiry / help request, inspect Enquiry record
    const targetEnqId = fromEnqId || enquiryId || fromEnq;
    let convertedEnquiry = null;
    let enquiryRecord = null;

    if (targetEnqId) {
      const enqLookup = buildEnquiryLookup(targetEnqId);
      enquiryRecord = await Enquiry.findOne({
        where: enqLookup,
        transaction,
      });
    }

    // Upload patient medical history files to Cloudinary; if none provided and converting from enquiry, inherit enquiry files
    let medicalFiles = await uploadMedicalFilesToCloudinary(req, {
      folder: "eldoria/medical_history",
      uploadedBy: adminActor,
    });

    const finalFiles = (medicalFiles && medicalFiles.length > 0)
      ? medicalFiles
      : (Array.isArray(enquiryRecord?.files) ? enquiryRecord.files : []);

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
        files: finalFiles,
        visit: {},
        history: initialHistory,
        confirmedBy,
        confirmedAt,
        assignedBy,
        assignedAt,
      },
      { transaction }
    );

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
            title: assignedStaffId ? "Booking confirmed" : "Booking request received",
            body: assignedStaffId
              ? `Your ${finalServiceName} booking ${bookingCode} is confirmed ${formattedTimeNotice}.`
              : `Your ${finalServiceName} booking request ${bookingCode} has been received for ${formattedTimeNotice}.`,
          },
          admin: {
            title: `New booking request ${bookingCode}`,
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
                title: `Open visit request ${bookingCode}`,
                body: `${finalServiceName} for ${trimmedPatientName} · ${date}, ${time} · needs caregiver`,
              },
        },
      },
      assignedStaffId
        ? `Booking ${bookingCode} created and confirmed successfully`
        : `Booking ${bookingCode} created successfully (request received)`,
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
    const staffName = staff.user?.name || staff.staffId;

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

    // Upload photos & report files if attached to status update request
    const uploadedAssets = await uploadVisitReportFilesToCloudinary(req, {
      uploadedBy: staffName,
      photoFolder: "eldoria/visit_reports/photos",
      docFolder: "eldoria/visit_reports/documents",
    });

    const normalizedVitals = normalizeVisitVitals(req.body);
    const updatedTasksList = normalizeVisitTasks(tasks || req.body?.tasksDone, booking.tasks);
    updates.tasks = updatedTasksList;

    const hasVitalsData = Boolean(
      normalizedVitals.bp ||
      normalizedVitals.pulse ||
      normalizedVitals.spo2 ||
      normalizedVitals.temperature ||
      normalizedVitals.sugar ||
      (visit && Object.keys(visit).length > 0)
    );

    const hasReportData =
      nextStatus === "completed" ||
      hasVitalsData ||
      uploadedAssets.photos.length > 0 ||
      uploadedAssets.files.length > 0 ||
      note;

    if (hasReportData) {
      const reportId = `rep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const reportDate = req.body.date || req.body.reportDate || now.toISOString().split("T")[0];

      const newReport = {
        id: reportId,
        date: reportDate,
        createdAt: now.toISOString(),
        submittedAt: now.toISOString(),
        staffId: staff.staffId,
        staffName,
        vitals: normalizedVitals,
        tasks: updatedTasksList,
        tasksCompletedCount: updatedTasksList.filter((t) => t.done).length,
        tasksTotalCount: updatedTasksList.length,
        notes: note || null,
        photos: uploadedAssets.photos,
        files: uploadedAssets.files,
        status: nextStatus,
        isCompleted: nextStatus === "completed",
      };

      const existingReports = Array.isArray(booking.reports) ? [...booking.reports] : [];
      existingReports.push(newReport);
      updates.reports = existingReports;

      updates.visit = {
        ...(booking.visit || {}),
        ...normalizedVitals,
        ...(visit && typeof visit === "object" ? visit : {}),
        lastReportAt: now.toISOString(),
        lastReportId: reportId,
      };
    } else if (visit && typeof visit === "object") {
      updates.visit = { ...(booking.visit || {}), ...visit };
    }

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
 * Staff Submits Daily Visit Report
 * Captures vitals (BP, pulse, SpO2, temp, sugar), tasks completed, observations/notes,
 * photos (Cloudinary uploaded) and optional report document (PDF/scan).
 * Can be submitted daily during ongoing care or upon completion of service.
 *
 * POST /api/v1/staff/booking/:id/report
 * POST /api/v1/staff/bookings/:id/report
 * POST /api/v1/staff/booking/:id/daily-report
 * PATCH /api/v1/staff/booking/:id/report
 */
const submitStaffVisitReport = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const body = req.body || {};
    const {
      status: nextStatus,
      markCompleted,
      notes,
      careNotes,
      remarks,
      date: customDate,
      reportDate,
      tasks,
      tasksDone,
    } = body;

    // 1. Resolve staff identity from token, headers, body, or query
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

    if (!staffId && req.user?.role !== "admin") {
      await transaction.rollback();
      return errorResponse(res, "Staff authentication or staffId is required to submit visit report", 401);
    }

    // 2. Fetch staff record if staffId provided
    let staff = null;
    if (staffId) {
      staff = await Staff.findOne({
        where: { staffId: String(staffId).trim() },
        include: [{ model: User, as: "user", attributes: ["id", "name", "phone", "email"] }],
        transaction,
      });
    }

    // 3. Fetch booking
    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    // Authorization: staff must be assigned to this booking (or admin)
    const isAdminUser = req.user?.role === "admin";
    if (!isAdminUser) {
      if (!booking.staffId) {
        await transaction.rollback();
        return errorResponse(res, `Booking ${booking.code} is not assigned to any caregiver yet.`, 400);
      }
      if (staff && String(booking.staffId).trim() !== String(staff.staffId).trim()) {
        await transaction.rollback();
        return errorResponse(res, `Unauthorized: You can only submit reports for visits assigned to you.`, 403);
      }
    }

    const staffName = staff?.user?.name || staff?.staffId || req.user?.name || "Caregiver";
    const effectiveStaffId = staff?.staffId || booking.staffId || "caregiver";

    // 4. Extract and normalize vitals (BP, pulse, SpO2, temp, sugar)
    const normalizedVitals = normalizeVisitVitals(body);

    // 5. Extract and update checklist tasks
    const updatedTasksList = normalizeVisitTasks(tasks || tasksDone, booking.tasks);

    // 6. Upload photos and report documents to Cloudinary
    const uploadedAssets = await uploadVisitReportFilesToCloudinary(req, {
      uploadedBy: staffName,
      photoFolder: "eldoria/visit_reports/photos",
      docFolder: "eldoria/visit_reports/documents",
    });

    // 7. Check if visit should be marked completed
    const now = new Date();
    const shouldComplete =
      nextStatus === "completed" ||
      markCompleted === true ||
      markCompleted === "true" ||
      body.isCompleted === true ||
      body.isCompleted === "true";

    const effectiveStatus = shouldComplete ? "completed" : (nextStatus || booking.status || "in_progress");

    // 8. Construct new report object
    const reportNote = (notes || careNotes || remarks || "").trim() || null;
    const finalReportDate = customDate || reportDate || now.toISOString().split("T")[0];
    const reportId = `rep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    const newReport = {
      id: reportId,
      date: finalReportDate,
      createdAt: now.toISOString(),
      submittedAt: now.toISOString(),
      staffId: effectiveStaffId,
      staffName,
      vitals: normalizedVitals,
      tasks: updatedTasksList,
      tasksCompletedCount: updatedTasksList.filter((t) => t.done).length,
      tasksTotalCount: updatedTasksList.length,
      notes: reportNote,
      photos: uploadedAssets.photos,
      files: uploadedAssets.files,
      status: effectiveStatus,
      isCompleted: shouldComplete,
    };

    const existingReports = Array.isArray(booking.reports) ? [...booking.reports] : [];
    existingReports.push(newReport);

    // 9. Prepare booking updates
    const photoUrls = uploadedAssets.photos.map((p) => p.url);
    const existingPhotos = Array.isArray(booking.visit?.photos) ? booking.visit.photos : [];

    const bookingUpdates = {
      reports: existingReports,
      visit: {
        ...(booking.visit || {}),
        ...normalizedVitals,
        latestNotes: reportNote || booking.visit?.latestNotes || null,
        lastReportAt: now.toISOString(),
        lastReportId: reportId,
        photos: photoUrls.concat(existingPhotos),
      },
      tasks: updatedTasksList,
    };

    if (shouldComplete && booking.status !== "completed") {
      bookingUpdates.status = "completed";
      if (!booking.checkOutAt) {
        bookingUpdates.checkOutAt = now;
      }
      if (!booking.checkInAt) {
        bookingUpdates.checkInAt = booking.assignedAt || now;
      }
    } else if (booking.status === "assigned" && !booking.checkInAt) {
      bookingUpdates.status = "in_progress";
      bookingUpdates.checkInAt = now;
    }

    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];
    existingHistory.push({
      status: bookingUpdates.status || booking.status,
      at: now.toISOString(),
      by: `staff:${effectiveStaffId}`,
      staffName,
      note: shouldComplete
        ? `Daily report submitted & service completed by ${staffName}`
        : `Daily visit report submitted by ${staffName}`,
      reportId,
    });
    bookingUpdates.history = existingHistory;

    await booking.update(bookingUpdates, { transaction });
    await transaction.commit();

    // 10. Refetch refreshed booking
    const refreshedBooking = await Booking.findOne({
      where: { id: booking.id },
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          attributes: ["id", "staffId", "qualification", "city", "area", "docs", "onDuty"],
          include: [{ model: User, as: "user", attributes: ["name", "phone", "email"] }],
        },
      ],
    });

    const notifications = {
      client: {
        to: `client:${booking.clientPhone}`,
        title: shouldComplete ? "Visit care completed" : "Daily care report updated",
        body: shouldComplete
          ? `Caregiver ${staffName} completed visit for ${booking.patientName}. Vitals & report are available in your app.`
          : `Caregiver ${staffName} updated daily report and vitals for ${booking.patientName}.`,
      },
      admin: {
        title: shouldComplete ? `Visit completed ${booking.code}` : `Daily report ${booking.code}`,
        body: `${staffName} submitted report for ${booking.patientName} (${booking.city}) · BP: ${normalizedVitals.bp || 'N/A'}, SpO2: ${normalizedVitals.spo2 || 'N/A'}`,
      },
    };

    return successResponse(
      res,
      {
        report: newReport,
        booking: refreshedBooking,
        notifications,
      },
      shouldComplete
        ? "Daily visit report submitted and visit marked as completed successfully."
        : "Daily visit report submitted successfully.",
      201
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to submit visit report", 500, error);
  }
};

/**
 * Get All Daily Visit Reports for a Booking
 * GET /api/v1/staff/booking/:id/reports
 * GET /api/v1/staff/bookings/:id/reports
 */
const getStaffVisitReports = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({
      where: buildBookingLookup(id),
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          attributes: ["id", "staffId", "qualification", "city", "area"],
          include: [{ model: User, as: "user", attributes: ["name", "phone"] }],
        },
      ],
    });

    if (!booking) {
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    const reportsList = Array.isArray(booking.reports) ? booking.reports : [];
    const latestReport = reportsList.length > 0 ? reportsList[reportsList.length - 1] : null;

    return successResponse(
      res,
      {
        bookingId: booking.id,
        bookingCode: booking.code,
        patientName: booking.patientName,
        serviceName: booking.serviceName,
        status: booking.status,
        vitals: booking.visit || {},
        tasks: booking.tasks || [],
        reportsCount: reportsList.length,
        latestReport,
        reports: reportsList,
      },
      "Visit reports retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve visit reports", 500, error);
  }
};

/**
 * Staff Confirms or Rejects a Booking Request / Assigned Visit
 * PATCH /api/v1/staff/booking/:id/confirm
 *
 * Rules:
 * - Requires 'canConfirmBooking' permission on the staff member.
 * - On CONFIRM: Can assign to themselves, OR to an approved colleague if staff also has 'canTransferBooking'.
 * - On REJECT: Can decline (returning booking to care desk for reassignment), OR transfer directly to an approved colleague if staff has 'canTransferBooking'.
 * - Admin sees all updates and can override any assignment at any time.
 */
const staffConfirmBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const body = req.body || {};

    // 1. Resolve requesting staff member
    let staffId = req.user?.staffId;
    if (!staffId && req.user?.id) {
      const staffRec = await Staff.findOne({ where: { userId: req.user.id }, transaction });
      staffId = staffRec?.staffId;
    }
    if (!staffId && (req.headers["x-staff-id"] || req.headers["staffid"])) {
      staffId = req.headers["x-staff-id"] || req.headers["staffid"];
    }
    if (!staffId && (body.fromStaffId || body.currentStaffId || body.assignerStaffId || body.staffId)) {
      staffId = body.fromStaffId || body.currentStaffId || body.assignerStaffId || body.staffId;
    }
    if (!staffId && req.query?.staffId) {
      staffId = req.query.staffId;
    }

    if (!staffId) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Staff authentication or 'staffId' is required to confirm or manage bookings.",
        401
      );
    }

    const staff = await Staff.findOne({
      where: buildStaffLookup(staffId),
      include: [{ model: User, as: "user", attributes: ["id", "name", "phone", "email"] }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, `Staff member '${staffId}' not found`, 404);
    }

    if (staff.approval !== "approved") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Staff member '${staff.user?.name || staff.staffId}' is not approved yet (status: '${staff.approval}'). Only approved staff can confirm or manage bookings.`,
        403
      );
    }

    // 2. Permission Check: staff MUST have canConfirmBooking permission
    if (!staff.canConfirmBooking) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Permission denied: You do not have permission to confirm or reject bookings ('canConfirmBooking' is disabled). Please contact care desk administrator.`,
        403
      );
    }

    // 3. Lookup Booking
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
      return errorResponse(res, `Cannot confirm or manage a cancelled booking (${booking.code})`, 400);
    }

    if (booking.status === "completed") {
      await transaction.rollback();
      return errorResponse(res, `Booking ${booking.code} is already completed`, 400);
    }

    // 4. Authorization Check:
    // If the booking is already assigned to another staff member, verify ownership
    if (booking.staffId && booking.staffId !== staff.staffId) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Unauthorized: This booking is currently assigned to another staff member (${booking.staffId}).`,
        403
      );
    }

    // 5. Determine Action: 'confirm' vs 'reject' / 'decline'
    const action = String(body.action || (body.confirm === false ? "reject" : "confirm")).toLowerCase().trim();
    const isReject = action === "reject" || action === "decline";
    const now = new Date();
    const staffName = staff.user?.name || staff.staffId;
    const actorTag = `staff:${staff.staffId}`;
    const existingHistory = Array.isArray(booking.history) ? [...booking.history] : [];
    const notificationTimeStr = formatNotificationDate(booking.date, booking.time);
    const serviceDisplayName = booking.serviceName || booking.service;

    // ==========================================
    // ACTION: REJECT / DECLINE
    // ==========================================
    if (isReject) {
      const rejectReason = body.reason || body.rejectReason || body.note || "Declined by staff";
      const targetColleagueId =
        body.assignTo ||
        body.colleagueId ||
        body.colleagueStaffId ||
        body.targetStaffId;

      // If colleague is specified AND staff has canTransferBooking, transfer to colleague
      if (targetColleagueId && staff.canTransferBooking) {
        const colleague = await Staff.findOne({
          where: buildStaffLookup(targetColleagueId),
          include: [{ model: User, as: "user", attributes: ["id", "name", "phone", "email"] }],
          transaction,
        });

        if (!colleague) {
          await transaction.rollback();
          return errorResponse(res, `Colleague staff member '${targetColleagueId}' not found`, 404);
        }

        if (colleague.approval !== "approved") {
          await transaction.rollback();
          return errorResponse(
            res,
            `Colleague '${colleague.user?.name || colleague.staffId}' is not approved yet (status: '${colleague.approval}').`,
            400
          );
        }

        const colleagueName = colleague.user?.name || colleague.staffId;
        const prevStaffId = booking.staffId || null;

        existingHistory.push({
          status: "assigned",
          at: now.toISOString(),
          by: actorTag,
          staffId: colleague.staffId,
          previousStaffId: prevStaffId,
          reason: rejectReason,
          note: `${booking.code} transferred from ${staffName} to ${colleagueName} (Reason: ${rejectReason})`,
        });

        await booking.update(
          {
            staffId: colleague.staffId,
            status: "assigned",
            assignedBy: actorTag,
            assignedAt: now,
            history: existingHistory,
          },
          { transaction }
        );

        await transaction.commit();

        const refreshed = await Booking.findOne({
          where: { id: booking.id },
          include: [
            {
              model: Staff,
              as: "assignedStaff",
              include: [{ model: User, as: "user", attributes: ["name", "phone", "email"] }],
            },
          ],
        });

        return successResponse(
          res,
          {
            booking: refreshed,
            action: "transferred_on_reject",
            assignedTo: {
              staffId: colleague.staffId,
              name: colleagueName,
            },
            transferredFrom: {
              staffId: staff.staffId,
              name: staffName,
              reason: rejectReason,
            },
            notification: {
              admin: {
                title: `${booking.code} transferred by staff`,
                body: `${staffName} declined and transferred ${booking.patientName}'s visit to ${colleagueName}. Reason: ${rejectReason}`,
              },
              colleague: {
                title: "New visit assigned",
                body: `${booking.patientName} · ${serviceDisplayName} · ${notificationTimeStr} · transferred by ${staffName}`,
              },
            },
          },
          `Booking ${booking.code} declined and successfully transferred to colleague ${colleagueName}.`
        );
      }

      // If colleague specified but staff does NOT have canTransferBooking
      if (targetColleagueId && !staff.canTransferBooking) {
        await transaction.rollback();
        return errorResponse(
          res,
          `Permission denied: You do not have permission to transfer bookings to a colleague ('canTransferBooking' is disabled).`,
          403
        );
      }

      // Standard Reject: unassign staff, return booking to confirmed pool for Care Desk / Admin
      existingHistory.push({
        status: "declined",
        at: now.toISOString(),
        by: actorTag,
        staffName,
        reason: rejectReason,
        note: `Visit declined by caregiver ${staffName} (Reason: ${rejectReason}). Returned to care desk pool.`,
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

      const refreshed = await Booking.findOne({ where: { id: booking.id } });

      return successResponse(
        res,
        {
          booking: refreshed,
          action: "rejected",
          declinedBy: {
            staffId: staff.staffId,
            name: staffName,
            reason: rejectReason,
          },
          notification: {
            admin: {
              title: `Visit declined: ${booking.code}`,
              body: `${staffName} declined visit for ${booking.patientName} (${rejectReason}). Care desk needs to assign another caregiver.`,
            },
          },
        },
        `Booking ${booking.code} declined. Returned to care desk for reassignment.`
      );
    }

    // ==========================================
    // ACTION: CONFIRM
    // ==========================================
    const targetColleagueId =
      body.assignTo ||
      body.colleagueId ||
      body.colleagueStaffId ||
      body.targetStaffId ||
      (body.assigneeStaffId && body.assigneeStaffId !== staff.staffId ? body.assigneeStaffId : null);

    let assignedStaff = staff; // Default: self-assignment

    // If assigning to another staff member:
    if (targetColleagueId && targetColleagueId !== staff.staffId && targetColleagueId !== "self") {
      // Must have canTransferBooking permission!
      if (!staff.canTransferBooking) {
        await transaction.rollback();
        return errorResponse(
          res,
          `Permission denied: To assign this booking to a colleague, you must have 'canTransferBooking' permission. Currently you only have permission to confirm and assign to yourself.`,
          403
        );
      }

      const colleague = await Staff.findOne({
        where: buildStaffLookup(targetColleagueId),
        include: [{ model: User, as: "user", attributes: ["id", "name", "phone", "email"] }],
        transaction,
      });

      if (!colleague) {
        await transaction.rollback();
        return errorResponse(res, `Colleague staff member '${targetColleagueId}' not found`, 404);
      }

      if (colleague.approval !== "approved") {
        await transaction.rollback();
        return errorResponse(
          res,
          `Colleague '${colleague.user?.name || colleague.staffId}' is not approved yet (status: '${colleague.approval}'). Only approved staff can be assigned.`,
          400
        );
      }

      assignedStaff = colleague;
    }

    // Ensure service tasks are populated if empty
    let currentTasks = booking.tasks;
    if (!Array.isArray(currentTasks) || currentTasks.length === 0) {
      const svc = await Service.findOne({
        where: { [Op.or]: [{ serviceId: booking.service }, { name: booking.service }] },
        transaction,
      });
      if (svc && Array.isArray(svc.tasks)) {
        currentTasks = svc.tasks.map((t) => ({
          label: typeof t === "string" ? t : t.label || "Care task",
          done: false,
        }));
      }
    }

    const assignedStaffName = assignedStaff.user?.name || assignedStaff.staffId;
    const isSelfAssign = assignedStaff.staffId === staff.staffId;

    if (!existingHistory.some((h) => h.status === "confirmed")) {
      existingHistory.push({
        status: "confirmed",
        at: now.toISOString(),
        by: actorTag,
        staffName,
        note: `Booking confirmed by ${staffName}`,
      });
    }

    const assignmentNote = isSelfAssign
      ? `${booking.code} confirmed and accepted by caregiver ${staffName}`
      : `${booking.code} confirmed by ${staffName} and assigned to colleague ${assignedStaffName}`;

    existingHistory.push({
      status: "assigned",
      at: now.toISOString(),
      by: actorTag,
      staffId: assignedStaff.staffId,
      previousStaffId: booking.staffId || null,
      note: assignmentNote,
    });

    await booking.update(
      {
        staffId: assignedStaff.staffId,
        status: "assigned",
        confirmedBy: booking.confirmedBy || actorTag,
        confirmedAt: booking.confirmedAt || now,
        assignedBy: actorTag,
        assignedAt: now,
        tasks: currentTasks,
        history: existingHistory,
      },
      { transaction }
    );

    await transaction.commit();

    // Refetch refreshed booking with associations
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

    const notifications = {
      client: {
        to: `client:${booking.clientPhone}`,
        title: "Caregiver assigned",
        body: `${assignedStaffName} (${assignedStaff.qualification || "Caregiver"}) will visit ${booking.patientName} ${notificationTimeStr}.`,
      },
      admin: {
        to: "admin",
        title: `${booking.code} confirmed by staff`,
        body: `${staffName} confirmed visit for ${booking.patientName} in ${booking.city}. Assigned to ${assignedStaffName}.`,
      },
    };

    if (!isSelfAssign) {
      notifications.colleague = {
        to: `staff:${assignedStaff.staffId}`,
        title: "New visit assigned",
        body: `${booking.patientName} · ${serviceDisplayName} · ${notificationTimeStr} · assigned by ${staffName}`,
      };
    }

    return successResponse(
      res,
      {
        booking: refreshedBooking,
        action: "confirmed",
        confirmedBy: {
          staffId: staff.staffId,
          name: staffName,
        },
        assignedTo: {
          staffId: assignedStaff.staffId,
          name: assignedStaffName,
          isSelf: isSelfAssign,
        },
        notifications,
      },
      isSelfAssign
        ? `Booking ${booking.code} confirmed and accepted successfully.`
        : `Booking ${booking.code} confirmed and assigned to ${assignedStaffName} successfully.`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to confirm booking", 500, error);
  }
};

/**
 * Staff Assigns or Reassigns a Visit to a Colleague
 * PATCH /api/v1/staff/booking/:id/reassign
 */
const staffAssignColleagueToBooking = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
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

    // 1. Resolve requesting staff member (assigner)
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

    let assigner = null;
    if (assignerStaffId) {
      assigner = await Staff.findOne({
        where: buildStaffLookup(assignerStaffId),
        include: [{ model: User, as: "user", attributes: ["id", "name", "phone", "email"] }],
        transaction,
      });
    }

    if (!assigner) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Staff authentication or assigner staff identifier is required to reassign visits.",
        401
      );
    }

    if (assigner.approval !== "approved") {
      await transaction.rollback();
      return errorResponse(
        res,
        `Staff member '${assigner.user?.name || assigner.staffId}' is not approved yet (status: '${assigner.approval}'). Only approved staff can reassign visits.`,
        403
      );
    }

    // 2. Permission check: assigner MUST have canTransferBooking permission
    if (!assigner.canTransferBooking) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Permission denied: Staff member '${assigner.user?.name || assigner.staffId}' does not have permission to transfer bookings to colleagues ('canTransferBooking' is disabled).`,
        403
      );
    }

    // 3. Lookup booking
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

    // If the booking is already assigned to a staff member, verify authority:
    if (booking.staffId && booking.staffId !== assigner.staffId) {
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
  assignStaffToBooking,
  unassignStaffFromBooking,
  confirmBooking,
  updateBookingStatus,
  getAvailableStaffForBooking,
  createAdminBooking,
  getStaffBookings,
  getStaffBookingById,
  updateStaffAssignedBookingStatus,
  submitStaffVisitReport,
  getStaffVisitReports,
  staffAssignColleagueToBooking,
  staffConfirmBooking,
};
