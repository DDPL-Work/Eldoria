const { Op } = require("sequelize");
const {
  sequelize,
  Enquiry,
  User,
  Client,
  Booking,
  Service,
  City,
  Setting,
  InAppNotification,
} = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");
const { generateEnquiryId } = require("../helpers/generateEnquiryID");
const { generateBookingId } = require("../helpers/generateBookingID");
const { uploadMedicalFilesToCloudinary } = require("../services/cloudinary.service");

/**
 * Standardize phone number format (extract 10-digit mobile)
 */
const normalizePhone = (phone = "") => {
  const digits = String(phone).replace(/[^\d]/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/**
 * Helper to build enquiry lookup condition by numeric ID or unique Code string
 */
const buildEnquiryLookup = (identifier) => {
  const num = parseInt(identifier, 10);
  if (!isNaN(num) && String(num) === String(identifier).trim()) {
    return { id: num };
  }
  return { code: String(identifier).trim() };
};

/**
 * Map guided form preferred timing to a concrete time slot
 */
const mapTimingToSlot = (timing) => {
  if (!timing) return "10:00 AM";
  const t = String(timing).toLowerCase();
  if (t.includes("morning")) return "09:00 AM";
  if (t.includes("afternoon")) return "02:00 PM";
  if (t.includes("evening")) return "06:00 PM";
  if (t.includes("night")) return "09:00 PM";
  if (t.includes("24") || t.includes("daytime")) return "09:00 AM";
  return "10:00 AM";
};

/**
 * Helper to fetch Care Desk contact details (Call & WhatsApp) for a given city
 * Falls back to global App setting if city has no dedicated contact.
 */
const resolveCareDeskContact = async (cityInput = "mumbai", transaction = null) => {
  const normalizedCity = String(cityInput || "mumbai").toLowerCase().trim();
  let phone = "9820012345";
  let whatsapp = "9820012345";
  let cityName = normalizedCity.charAt(0).toUpperCase() + normalizedCity.slice(1);

  try {
    if (City && typeof City.findOne === "function") {
      const cityRecord = await City.findOne({
        where: {
          [Op.or]: [
            { cityId: normalizedCity },
            sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), normalizedCity),
          ],
        },
        transaction,
      });

      if (cityRecord) {
        cityName = cityRecord.name || cityName;
        if (cityRecord.phone) phone = normalizePhone(cityRecord.phone);
        if (cityRecord.whatsapp) whatsapp = normalizePhone(cityRecord.whatsapp);
      }
    }

    if (Setting && typeof Setting.findByPk === "function") {
      const globalSetting = await Setting.findByPk("app", { transaction });
      if (globalSetting) {
        if (!phone && globalSetting.phone) phone = normalizePhone(globalSetting.phone);
        if (!whatsapp && globalSetting.whatsapp) whatsapp = normalizePhone(globalSetting.whatsapp);
      }
    }
  } catch (err) {
    // Graceful fallback to default contacts
  }

  const cleanPhone = phone || "9820012345";
  const cleanWhatsapp = whatsapp || cleanPhone;

  return {
    city: cityName,
    phone: cleanPhone,
    whatsapp: cleanWhatsapp,
    callUrl: `tel:+91${cleanPhone}`,
    whatsappUrl: `https://wa.me/91${cleanWhatsapp}?text=${encodeURIComponent(
      "Hello Eldoria Care at Home, I need guidance regarding care services."
    )}`,
  };
};

/**
 * Helper to generate pre-composed WhatsApp message URL for an enquiry
 */
const buildEnquiryWhatsAppUrl = (whatsappNumber, enquiryCode, clientName) => {
  const cleanNumber = normalizePhone(whatsappNumber) || "9820012345";
  const text = `Hello Eldoria, this is ${clientName || "a family member"} regarding help request ${enquiryCode}. I would like to talk about home care.`;
  return `https://wa.me/91${cleanNumber}?text=${encodeURIComponent(text)}`;
};

/**
 * Helper to resolve and populate recommended service metadata
 */
const populateRecommendedService = async (recommended, transaction = null) => {
  if (!recommended) return null;
  const recStr = String(recommended).trim();
  const isNumeric = !isNaN(Number(recStr)) && /^\d+$/.test(recStr);

  const where = isNumeric
    ? { [Op.or]: [{ id: Number(recStr) }, { serviceId: recStr }, { code: recStr }] }
    : { [Op.or]: [{ serviceId: recStr }, { name: recStr }, { code: recStr }] };

  try {
    if (Service && typeof Service.findOne === "function") {
      const service = await Service.findOne({
        where,
        attributes: [
          "id",
          "serviceId",
          "name",
          "code",
          "category",
          "categoryName",
          "price",
          "pricingType",
          "tasks",
          "description",
          "icon",
          "enabled",
        ],
        transaction,
      });

      if (service) {
        return {
          id: service.id,
          serviceId: service.serviceId,
          name: service.name,
          code: service.code,
          category: service.category,
          categoryName: service.categoryName,
          price: Number(service.price) || 0,
          pricingType: service.pricingType || "per_visit",
          tasks: Array.isArray(service.tasks) ? service.tasks : [],
          desc: service.description || "",
          icon: service.icon || "cross",
          isBookable: service.enabled !== false,
        };
      }
    }
  } catch (_) {}

  // Fallback placeholder object if service string exists
  return {
    id: recStr,
    serviceId: recStr,
    name: recStr,
    price: 0,
    tasks: [],
    isBookable: true,
  };
};

/**
 * Safely create an InAppNotification for a client
 */
const createInAppAlert = async ({
  userId = null,
  phone,
  title,
  message,
  type = "general",
  targetType = "enquiry",
  targetId,
  metadata = {},
  transaction = null,
}) => {
  if (!phone || !InAppNotification || typeof InAppNotification.create !== "function") {
    return null;
  }
  try {
    return await InAppNotification.create(
      {
        userId,
        phone: normalizePhone(phone),
        title,
        message,
        type,
        targetType,
        targetId: String(targetId || ""),
        isRead: false,
        metadata,
      },
      { transaction }
    );
  } catch (err) {
    console.warn("⚠️ Failed to create InAppNotification record:", err.message);
    return null;
  }
};

// =========================================================================
// 1. CLIENT ENQUIRY FLOW
// =========================================================================

/**
 * Client Creates an Enquiry / Help Request ("Not sure what care you need?")
 * Guided form: describe the need, patient type, age, location/area, expected duration, preferred timing.
 * Upload prescription, discharge summary or photo (image/PDF, compressed on device).
 * Request goes straight to the Admin Panel; client sees “Help request sent” plus Call/WhatsApp options.
 *
 * POST /api/v1/client/enquiry/create (aliases: /api/v1/client/enquiry, /api/v1/client/enquiries)
 */
const createClientEnquiry = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const body = req.body || {};
    const {
      description,
      patientType,
      patientAge,
      city,
      area,
      address,
      duration,
      timing,
      files,
    } = body;

    // Get client identity from authenticated token or request payload
    const rawClientName = req.user?.name || body.clientName || "";
    const rawClientPhone = req.user?.phone || body.clientPhone || "";
    const directClientId = req.user?.id || body.clientId || null;

    const clientName = String(rawClientName).trim();
    const cleanPhone = normalizePhone(rawClientPhone);
    const trimmedDesc = String(description || "").trim();
    const trimmedPatientType = String(patientType || "").trim();
    const enquiryCity = (city || req.user?.city || "mumbai").toLowerCase().trim();

    // Validation matching frontend & clinical requirements
    if (!clientName) {
      await transaction.rollback();
      return errorResponse(res, "Client name is required.", 400);
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      await transaction.rollback();
      return errorResponse(res, "A valid 10-digit mobile number is required.", 400);
    }
    if (!trimmedDesc || trimmedDesc.length < 5) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Please describe your care requirement (at least 5 characters).",
        400
      );
    }

    // Link client account if user already exists
    let finalClientId = directClientId ? String(directClientId) : null;
    let clientUserId = req.user?.id || null;

    if (User && typeof User.findOne === "function") {
      const existingUser = await User.findOne({
        where: { phone: cleanPhone },
        include: Client ? [{ model: Client, as: "clientProfile", required: false }] : [],
        transaction,
      });

      if (existingUser) {
        clientUserId = existingUser.id;
        finalClientId = existingUser.clientProfile?.clientId || String(existingUser.id);
      }
    }

    // Validate and process attached files (prescriptions, discharge summary, photos - max 3 files)
    let safeFiles = [];
    try {
      // 1. Process multipart files or Cloudinary upload
      if (typeof uploadMedicalFilesToCloudinary === "function") {
        const uploaded = await uploadMedicalFilesToCloudinary(req, {
          folder: "eldoria/enquiries",
          uploadedBy: "client",
        });
        if (Array.isArray(uploaded) && uploaded.length > 0) {
          safeFiles = uploaded.slice(0, 3);
        }
      }
    } catch (uploadErr) {
      console.warn("⚠️ Cloudinary upload warning in createClientEnquiry:", uploadErr.message);
    }

    // 2. Fallback to req.files or req.body.files if not processed above
    if (safeFiles.length === 0) {
      if (Array.isArray(req.files) && req.files.length > 0) {
        safeFiles = req.files.slice(0, 3).map((f) => {
          const fileData = f.buffer ? `data:${f.mimetype || "application/pdf"};base64,${f.buffer.toString("base64")}` : null;
          return {
            id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: String(f.originalname || "attachment").slice(0, 100),
            type: f.mimetype || "application/pdf",
            size: typeof f.size === "number" ? f.size : 0,
            url: fileData,
            data: fileData,
          };
        });
      } else if (Array.isArray(files)) {
        safeFiles = files.slice(0, 3).map((f) => ({
          id: f.id || `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: String(f.name || f.originalname || "attachment").slice(0, 100),
          type: f.type || f.mimetype || "application/pdf",
          size: typeof f.size === "number" ? f.size : 0,
          url: f.url || f.data || null,
          data: f.data || f.url || null,
        }));
      }
    }

    // Generate unique Enquiry Code (e.g. ELDENPM260001)
    const enquiryCode = await generateEnquiryId(clientName, enquiryCity, transaction);
    const now = new Date();

    const initialHistory = [
      {
        status: "new",
        at: now.toISOString(),
        by: "client",
        note: "Help request submitted by client",
      },
    ];

    const newEnquiry = await Enquiry.create(
      {
        code: enquiryCode,
        clientId: finalClientId,
        clientName,
        clientPhone: cleanPhone,
        city: enquiryCity,
        area: area ? String(area).trim() : (address ? String(address).trim() : null),
        address: address ? String(address).trim() : (area ? String(area).trim() : null),
        description: trimmedDesc,
        patientType: trimmedPatientType || "Elderly parent",
        patientAge: patientAge ? String(patientAge).trim() : null,
        duration: duration ? String(duration).trim() : "Not sure yet",
        timing: timing ? String(timing).trim() : "Flexible",
        files: safeFiles,
        status: "new",
        recommended: null,
        adminNote: null,
        bookingId: null,
        history: initialHistory,
      },
      { transaction }
    );

    // Resolve Care Desk Contact options (Call and WhatsApp) for this city
    const careDesk = await resolveCareDeskContact(enquiryCity, transaction);
    careDesk.whatsappUrl = buildEnquiryWhatsAppUrl(careDesk.whatsapp, enquiryCode, clientName);

    // Persist In-App Notification for client
    await createInAppAlert({
      userId: clientUserId,
      phone: cleanPhone,
      title: "Help request sent",
      message: "Our care team will call you soon to recommend the right service.",
      type: "general",
      targetType: "enquiry",
      targetId: enquiryCode,
      metadata: { enquiryId: newEnquiry.id, enquiryCode },
      transaction,
    });

    await transaction.commit();

    return successResponse(
      res,
      {
        enquiry: newEnquiry,
        careDesk,
        notification: {
          client: {
            to: `client:${cleanPhone}`,
            title: "Help request sent",
            body: "Our care team will call you soon to recommend the right service.",
          },
          admin: {
            title: `New help request ${enquiryCode}`,
            body: `${clientName} (${enquiryCity}) · ${trimmedPatientType || "Care need"}: ${trimmedDesc.slice(0, 90)}`,
          },
        },
      },
      `Help request ${enquiryCode} submitted successfully. Our care team will reach out shortly.`,
      201
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to create help request", 500, error);
  }
};

/**
 * Get Client's Own Enquiries List
 * Returns list with populated recommendations, care desk contact options, and linked bookings
 * GET /api/v1/client/enquiries
 */
const getClientEnquiries = async (req, res) => {
  try {
    let clientPhone = "";
    let clientId = null;

    if (req.user && req.user.role !== "admin") {
      clientPhone = normalizePhone(req.user.phone || "");
      clientId = req.user.id || null;
    } else {
      clientPhone = normalizePhone(req.user?.phone || req.query.phone || "");
      clientId = req.user?.id || req.query.clientId || null;
    }

    if (!clientPhone && !clientId) {
      return errorResponse(
        res,
        "Authentication or client phone is required to view enquiries.",
        400
      );
    }

    const where = {};
    if (clientPhone) {
      where.clientPhone = clientPhone;
    } else if (clientId) {
      where.clientId = String(clientId);
    }

    const enquiries = await Enquiry.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    // Populate recommendations, care desk contacts, and bookings
    const enriched = await Promise.all(
      enquiries.map(async (enq) => {
        const plain = enq.toJSON();
        const careDesk = await resolveCareDeskContact(enq.city);
        careDesk.whatsappUrl = buildEnquiryWhatsAppUrl(careDesk.whatsapp, enq.code, enq.clientName);

        let recommendedService = null;
        if (enq.recommended) {
          recommendedService = await populateRecommendedService(enq.recommended);
        }

        let linkedBooking = null;
        if (enq.bookingId && Booking && typeof Booking.findByPk === "function") {
          linkedBooking = await Booking.findByPk(enq.bookingId, {
            attributes: ["id", "code", "status", "serviceName", "date", "time"],
          });
        }

        return {
          ...plain,
          recommendedService,
          careDesk,
          booking: linkedBooking,
        };
      })
    );

    return successResponse(
      res,
      enriched,
      `Retrieved ${enriched.length} help request(s) successfully`
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to fetch client enquiries", 500, error);
  }
};

/**
 * Get Single Client Enquiry by ID or Code
 * Client views recommendation, clinical advice note, and can book in one tap
 * GET /api/v1/client/enquiry/:id
 */
const getClientEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, "Enquiry ID or code is required.", 400);
    }

    const enquiry = await Enquiry.findOne({
      where: buildEnquiryLookup(id),
    });

    if (!enquiry) {
      return errorResponse(res, "Help request not found.", 404);
    }

    // Resolve Care Desk Contact (Call / WhatsApp options)
    const careDesk = await resolveCareDeskContact(enquiry.city);
    careDesk.whatsappUrl = buildEnquiryWhatsAppUrl(careDesk.whatsapp, enquiry.code, enquiry.clientName);

    // Resolve recommended service metadata
    let recommendedService = null;
    if (enquiry.recommended) {
      recommendedService = await populateRecommendedService(enquiry.recommended);
    }

    // Resolve linked booking if converted
    let linkedBooking = null;
    if (enquiry.bookingId && Booking && typeof Booking.findByPk === "function") {
      linkedBooking = await Booking.findByPk(enquiry.bookingId, {
        attributes: ["id", "code", "status", "serviceName", "date", "time"],
      });
    } else if (Booking && typeof Booking.findOne === "function") {
      linkedBooking = await Booking.findOne({
        where: {
          [Op.or]: [
            { notes: { [Op.like]: `%${enquiry.code}%` } },
            { clientPhone: enquiry.clientPhone },
          ],
        },
        attributes: ["id", "code", "status", "serviceName", "date", "time"],
        order: [["createdAt", "DESC"]],
      });
    }

    return successResponse(
      res,
      {
        ...enquiry.toJSON(),
        recommendedService,
        careDesk,
        booking: linkedBooking,
        isBookableInOneTap: Boolean(recommendedService && (!enquiry.bookingId || enquiry.status !== "converted")),
      },
      "Help request retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to fetch enquiry", 500, error);
  }
};

/**
 * Client Books the Recommended Service in One Tap
 * Takes the recommended care service and patient details directly from the Enquiry
 * Creates booking immediately and transitions enquiry to 'converted'
 *
 * POST /api/v1/client/enquiry/:id/book (aliases: /api/v1/client/enquiry/:id/convert-to-booking, /api/v1/client/enquiries/:id/book)
 */
const bookEnquiryRecommendation = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const body = req.body || {};

    if (!id) {
      await transaction.rollback();
      return errorResponse(res, "Enquiry ID or code is required.", 400);
    }

    const enquiry = await Enquiry.findOne({
      where: buildEnquiryLookup(id),
      transaction,
    });

    if (!enquiry) {
      await transaction.rollback();
      return errorResponse(res, `Help request '${id}' not found`, 404);
    }

    // Verify client authorization if caller is authenticated (SEC-18)
    if (req.user && req.user.role !== 'admin' && enquiry.clientPhone) {
      const userPhoneDigits = String(req.user.phone || '').replace(/\D/g, '').slice(-10);
      const enquiryPhoneDigits = String(enquiry.clientPhone).replace(/\D/g, '').slice(-10);
      if (userPhoneDigits && enquiryPhoneDigits && userPhoneDigits !== enquiryPhoneDigits) {
        await transaction.rollback();
        return errorResponse(res, "You are not authorized to convert this help request", 403);
      }
    }

    // Check if already converted and has an active booking
    if (enquiry.status === "converted" && enquiry.bookingId && Booking) {
      const existingBooking = await Booking.findByPk(enquiry.bookingId, { transaction });
      if (existingBooking) {
        await transaction.commit();
        return successResponse(
          res,
          {
            booking: existingBooking,
            enquiry,
            alreadyBooked: true,
          },
          `This help request has already been booked (Booking ${existingBooking.code}).`,
          200
        );
      }
    }

    // Determine service to book (from admin recommendation or override in request body)
    const targetServiceInput = body.serviceId || body.service || enquiry.recommended;
    if (!targetServiceInput) {
      await transaction.rollback();
      return errorResponse(
        res,
        "No service has been recommended for this help request yet. Please wait for our clinical team's recommendation or choose a service to book.",
        400
      );
    }

    // Resolve service metadata from Service catalog
    const serviceRecord = await populateRecommendedService(targetServiceInput, transaction);
    const finalServiceName = serviceRecord?.name || String(targetServiceInput);
    const finalServiceId = serviceRecord?.serviceId || String(targetServiceInput);
    const finalCategoryId = serviceRecord?.category || "care";
    const finalCategoryName = serviceRecord?.categoryName || "Care at Home";
    const servicePrice = Number(serviceRecord?.price) || 0;

    const bookingCity = (body.city || enquiry.city || "mumbai").toLowerCase().trim();
    const clientName = enquiry.clientName || body.clientName || "Client";
    const clientPhone = enquiry.clientPhone || body.clientPhone || "";

    // Generate unique Booking Code
    const bookingCode = await generateBookingId(clientName, bookingCity, transaction);

    const bookingDate = body.date
      ? String(body.date).trim()
      : new Date().toISOString().split("T")[0];
    const bookingTime = body.time
      ? String(body.time).trim()
      : mapTimingToSlot(enquiry.timing);

    const initialTasks = Array.isArray(serviceRecord?.tasks) && serviceRecord.tasks.length > 0
      ? serviceRecord.tasks.map((taskLabel) => ({
          label: typeof taskLabel === "string" ? taskLabel : taskLabel.label || "Care task",
          done: false,
        }))
      : [];

    const now = new Date();
    const isActorAdmin = req.user?.role === "admin";
    const actorRole = isActorAdmin ? "admin" : "client";

    const initialHistory = [
      {
        status: isActorAdmin ? "confirmed" : "requested",
        at: now.toISOString(),
        by: actorRole,
        note: `One-tap booking created from help request ${enquiry.code}`,
      },
    ];

    // Create the booking
    const newBooking = await Booking.create(
      {
        code: bookingCode,
        clientId: enquiry.clientId || null,
        clientName,
        clientPhone,
        patientName: (body.patientName || enquiry.clientName || "Patient").trim(),
        patientAge: body.patientAge ? String(body.patientAge).trim() : (enquiry.patientAge || null),
        patientGender: body.patientGender || null,
        relation: body.relation || (enquiry.patientType ? `Patient (${enquiry.patientType})` : "Mother"),
        serviceId: finalServiceId,
        service: finalServiceId,
        serviceName: finalServiceName,
        categoryId: finalCategoryId,
        category: finalCategoryName,
        plan: body.plan || enquiry.duration || "Single visit",
        city: bookingCity,
        area: body.area ? String(body.area).trim() : (enquiry.area || null),
        address: body.address ? String(body.address).trim() : (enquiry.address || enquiry.area || "Home address"),
        date: bookingDate,
        time: bookingTime,
        status: isActorAdmin ? "confirmed" : "requested",
        staffId: body.staffId || null,
        source: isActorAdmin ? "Admin (Enquiry Conversion)" : "App (Enquiry One-Tap)",
        notes: body.notes
          ? String(body.notes).trim()
          : (enquiry.description ? `From help request ${enquiry.code}: ${enquiry.description}` : `Booked in one tap from ${enquiry.code}`),
        price: servicePrice,
        tasks: initialTasks,
        files: Array.isArray(enquiry.files) ? enquiry.files : [],
        visit: {},
        history: initialHistory,
        confirmedBy: isActorAdmin ? (req.user?.name || "admin") : null,
        confirmedAt: isActorAdmin ? now : null,
        assignedBy: null,
        assignedAt: null,
      },
      { transaction }
    );

    // Update enquiry status to 'converted' and link bookingId
    const existingEnquiryHistory = Array.isArray(enquiry.history) ? [...enquiry.history] : [];
    existingEnquiryHistory.push({
      status: "converted",
      at: now.toISOString(),
      by: actorRole,
      note: `Booking ${bookingCode} created in one tap (${finalServiceName})`,
    });

    await enquiry.update(
      {
        status: "converted",
        bookingId: newBooking.id,
        recommended: enquiry.recommended || finalServiceId,
        history: existingEnquiryHistory,
      },
      { transaction }
    );

    // Persist In-App Notification for client
    await createInAppAlert({
      phone: clientPhone,
      title: "Booking request received",
      message: `Your ${finalServiceName} booking ${bookingCode} has been created from your help request.`,
      type: "booking_update",
      targetType: "booking",
      targetId: bookingCode,
      metadata: { bookingId: newBooking.id, bookingCode, enquiryCode: enquiry.code },
      transaction,
    });

    await transaction.commit();

    return successResponse(
      res,
      {
        booking: newBooking,
        enquiry: {
          ...enquiry.toJSON(),
          booking: {
            id: newBooking.id,
            code: newBooking.code,
            status: newBooking.status,
            serviceName: newBooking.serviceName,
            date: newBooking.date,
            time: newBooking.time,
          },
        },
        notification: {
          client: {
            title: "Booking request received",
            body: `Your ${finalServiceName} booking ${bookingCode} is confirmed for ${bookingDate}, ${bookingTime}.`,
          },
          admin: {
            title: `New booking ${bookingCode}`,
            body: `${clientName} booked ${finalServiceName} in one tap from ${enquiry.code}.`,
          },
        },
      },
      `Booking ${bookingCode} created successfully in one tap!`,
      201
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to book recommended service", 500, error);
  }
};

// =========================================================================
// 2. ADMIN ENQUIRY MANAGEMENT FLOW
// =========================================================================

/**
 * Admin Fetches Enquiries (List with filters, search, city filter, counts & pagination)
 * Reference: admin/src/components/admin/Enquiries.jsx
 * GET /api/v1/admin/enquiries (and /api/v1/admin/enquiries/all)
 */
const getAdminEnquiries = async (req, res) => {
  try {
    const {
      status,
      filter,
      city,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNumber - 1) * pageSize;

    const enquiryWhere = {};

    // 1. Status filtering matching frontend tabs: 'open', 'new', 'converted', 'closed', 'all'
    const statusParam = (status || filter || "").toLowerCase().trim();
    if (statusParam === "open") {
      enquiryWhere.status = { [Op.in]: ["new", "contacted"] };
    } else if (statusParam && statusParam !== "all") {
      enquiryWhere.status = statusParam;
    }

    // 2. City filtering matching frontend city selector ('all' or specific city)
    const cityParam = (city || "").toLowerCase().trim();
    const cityFilterWhere = {};
    if (cityParam && cityParam !== "all") {
      enquiryWhere.city = { [Op.like]: `%${cityParam}%` };
      cityFilterWhere.city = { [Op.like]: `%${cityParam}%` };
    }

    // 3. Search query across code, clientName, clientPhone, patientType, description, address, area, recommended
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      enquiryWhere[Op.or] = [
        { code: { [Op.like]: searchTerm } },
        { clientName: { [Op.like]: searchTerm } },
        { clientPhone: { [Op.like]: searchTerm } },
        { patientType: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } },
        { address: { [Op.like]: searchTerm } },
        { area: { [Op.like]: searchTerm } },
        { recommended: { [Op.like]: searchTerm } },
      ];
    }

    // Compute status counts for frontend chips within the selected city
    const allEnquiriesInCity = await Enquiry.findAll({
      where: cityFilterWhere,
      attributes: ["id", "status"],
    });

    const counts = {
      all: allEnquiriesInCity.length,
      open: allEnquiriesInCity.filter((e) => e.status === "new" || e.status === "contacted").length,
      new: allEnquiriesInCity.filter((e) => e.status === "new").length,
      converted: allEnquiriesInCity.filter((e) => e.status === "converted").length,
      closed: allEnquiriesInCity.filter((e) => e.status === "closed").length,
    };

    const ALLOWED_ENQUIRY_SORT = ['id', 'createdAt', 'updatedAt', 'code', 'clientName', 'clientPhone', 'status', 'city', 'patientType', 'urgent', 'submittedAt'];
    const safeSortBy = ALLOWED_ENQUIRY_SORT.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: enquiries } = await Enquiry.findAndCountAll({
      where: enquiryWhere,
      order: [[safeSortBy, safeSortOrder]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / pageSize);

    return successResponse(
      res,
      {
        enquiries,
        counts,
        pagination: {
          total: count,
          currentPage: pageNumber,
          totalPages,
          limit: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Help requests retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to fetch enquiries", 500, error);
  }
};

/**
 * Admin Fetches Single Enquiry by ID or Code
 * Reference: admin/src/components/admin/EnquiryDetail.jsx
 * GET /api/v1/admin/enquiry/:id (and /api/v1/admin/enquiries/:id)
 */
const getAdminEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Enquiry ID or code is required.", 400);
    }

    const enquiry = await Enquiry.findOne({
      where: buildEnquiryLookup(id),
    });

    if (!enquiry) {
      return errorResponse(res, `Help request '${id}' not found`, 404);
    }

    // Resolve recommended service metadata
    let recommendedService = null;
    if (enquiry.recommended) {
      recommendedService = await populateRecommendedService(enquiry.recommended);
    }

    // Resolve linked booking if converted
    let linkedBooking = null;
    if (enquiry.bookingId && Booking && typeof Booking.findByPk === "function") {
      linkedBooking = await Booking.findByPk(enquiry.bookingId, {
        attributes: ["id", "code", "status", "serviceName", "date", "time"],
      });
    } else if (Booking && typeof Booking.findOne === "function") {
      linkedBooking = await Booking.findOne({
        where: {
          [Op.or]: [
            { notes: { [Op.like]: `%${enquiry.code}%` } },
            { clientPhone: enquiry.clientPhone },
          ],
        },
        attributes: ["id", "code", "status", "serviceName", "date", "time"],
        order: [["createdAt", "DESC"]],
      });
    }

    // Quick contact URLs for admin
    const cleanPhone = enquiry.clientPhone;
    const adminMsg = `Hello ${enquiry.clientName}, this is the Eldoria Care at Home clinical team regarding your request ${enquiry.code}.`;
    const quickContact = {
      phone: cleanPhone,
      callUrl: `tel:+91${cleanPhone}`,
      whatsappUrl: `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(adminMsg)}`,
    };

    return successResponse(
      res,
      {
        ...enquiry.toJSON(),
        recommendedService,
        booking: linkedBooking,
        quickContact,
      },
      "Help request details retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to fetch enquiry details", 500, error);
  }
};

/**
 * Admin Updates Enquiry (Clinical recommendation, admin note, or status toggle)
 * Reference: admin/src/components/admin/EnquiryDetail.jsx handleSaveRecommendation & handleStatusToggle
 * PATCH /api/v1/admin/enquiry/:id
 */
const updateAdminEnquiry = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const body = req.body || {};
    const { adminNote, recommended, status, note } = body;

    if (!id) {
      await transaction.rollback();
      return errorResponse(res, "Enquiry ID or code is required.", 400);
    }

    const enquiry = await Enquiry.findOne({
      where: buildEnquiryLookup(id),
      transaction,
    });

    if (!enquiry) {
      await transaction.rollback();
      return errorResponse(res, `Help request '${id}' not found`, 404);
    }

    const adminActor = req.user?.name || req.user?.email || "admin";
    const now = new Date();

    const noteText = (adminNote !== undefined ? adminNote : note !== undefined ? note : enquiry.adminNote || "").trim();
    const recommendedSvc = recommended !== undefined ? String(recommended).trim() : enquiry.recommended;

    const VALID_ENQUIRY_STATUSES = ["new", "contacted", "converted", "closed"];
    let nextStatus = enquiry.status;
    if (status) {
      const normalizedStatus = String(status).toLowerCase().trim();
      if (!VALID_ENQUIRY_STATUSES.includes(normalizedStatus)) {
        await transaction.rollback();
        return errorResponse(
          res,
          `Invalid status '${status}'. Valid status values are: ${VALID_ENQUIRY_STATUSES.join(", ")}.`,
          400
        );
      }
      nextStatus = normalizedStatus;
    } else if (enquiry.status === "new" && (noteText || recommendedSvc)) {
      nextStatus = "contacted";
    }

    const existingHistory = Array.isArray(enquiry.history) ? [...enquiry.history] : [];
    existingHistory.push({
      status: nextStatus,
      at: now.toISOString(),
      by: "admin",
      note: noteText || `Status updated to ${nextStatus} by ${adminActor}`,
    });

    await enquiry.update(
      {
        adminNote: noteText || null,
        recommended: recommendedSvc || null,
        status: nextStatus,
        history: existingHistory,
      },
      { transaction }
    );

    // Resolve recommendation metadata for the response & notification
    let recommendedService = null;
    let serviceLabel = "";
    if (recommendedSvc) {
      recommendedService = await populateRecommendedService(recommendedSvc, transaction);
      if (recommendedService?.name) {
        serviceLabel = `Recommended: ${recommendedService.name}. `;
      }
    }

    const notificationBody = serviceLabel + (noteText || "Open your help request in the app to view our recommendation.");

    // Persist In-App Notification for client
    await createInAppAlert({
      phone: enquiry.clientPhone,
      title: "Our care team replied",
      message: notificationBody,
      type: "general",
      targetType: "enquiry",
      targetId: enquiry.code,
      metadata: { enquiryId: enquiry.id, enquiryCode: enquiry.code },
      transaction,
    });

    await transaction.commit();

    return successResponse(
      res,
      {
        enquiry: {
          ...enquiry.toJSON(),
          recommendedService,
        },
        notification: {
          client: {
            to: `client:${enquiry.clientPhone}`,
            title: "Our care team replied",
            body: notificationBody,
          },
        },
      },
      "Help request recommendation and status updated successfully"
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to update enquiry", 500, error);
  }
};

module.exports = {
  createClientEnquiry,
  getClientEnquiries,
  getClientEnquiryById,
  bookEnquiryRecommendation,
  getAdminEnquiries,
  getAdminEnquiryById,
  updateAdminEnquiry,
  // Helper exports for unit testing and modular use
  normalizePhone,
  buildEnquiryLookup,
  resolveCareDeskContact,
  populateRecommendedService,
  mapTimingToSlot,
};
