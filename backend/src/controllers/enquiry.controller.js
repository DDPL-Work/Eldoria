const { Op } = require("sequelize");
const { sequelize, Enquiry, User, Client, Booking, Service } = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");
const { generateEnquiryId } = require("../helpers/generateEnquiryID");

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

// =========================================================================
// 1. CLIENT ENQUIRY FLOW
// =========================================================================

/**
 * Client Creates an Enquiry / Help Request ("Not sure what care you need?")
 * Reference: index.html helpForm & helpSubmit
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

    // Validation matching frontend requirements
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
    const existingUser = await User.findOne({
      where: { phone: cleanPhone },
      include: [{ model: Client, as: "clientProfile", required: false }],
      transaction,
    });

    if (existingUser) {
      finalClientId = existingUser.clientProfile?.clientId || String(existingUser.id);
    }

    // Validate and normalize attached files (up to 3 files as per frontend specification)
    let safeFiles = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      safeFiles = req.files.slice(0, 3).map((f) => ({
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: String(f.originalname || "attachment").slice(0, 100),
        type: f.mimetype || "application/pdf",
        size: typeof f.size === "number" ? f.size : 0,
        url: null,
      }));
    } else if (Array.isArray(files)) {
      safeFiles = files.slice(0, 3).map((f) => ({
        id: f.id || `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: String(f.name || "attachment").slice(0, 100),
        type: f.type || "application/pdf",
        size: typeof f.size === "number" ? f.size : 0,
        url: f.url || f.data || null,
        data: f.data || f.url || null,
      }));
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
        patientType: trimmedPatientType || "General care",
        patientAge: patientAge ? String(patientAge).trim() : null,
        duration: duration ? String(duration).trim() : null,
        timing: timing ? String(timing).trim() : null,
        files: safeFiles,
        status: "new",
        recommended: null,
        adminNote: null,
        history: initialHistory,
      },
      { transaction }
    );

    await transaction.commit();

    return successResponse(
      res,
      {
        enquiry: newEnquiry,
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
 * GET /api/v1/client/enquiries
 */
const getClientEnquiries = async (req, res) => {
  try {
    const clientPhone = normalizePhone(req.user?.phone || req.query.phone || "");
    const clientId = req.user?.id || req.query.clientId || null;

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

    return successResponse(
      res,
      enquiries,
      `Retrieved ${enquiries.length} help request(s) successfully`
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to fetch client enquiries", 500, error);
  }
};

/**
 * Get Single Client Enquiry by ID or Code
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

    return successResponse(res, enquiry, "Help request retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to fetch enquiry", 500, error);
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

    // 3. Search query across code, clientName, clientPhone, patientType, description, address, area
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

    const { count, rows: enquiries } = await Enquiry.findAndCountAll({
      where: enquiryWhere,
      order: [[sortBy, sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
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

    // Optional check: look up if a booking exists that was converted from this enquiry
    let linkedBooking = null;
    const booking = await Booking.findOne({
      where: {
        [Op.or]: [
          { notes: { [Op.like]: `%${enquiry.code}%` } },
          { clientPhone: enquiry.clientPhone },
        ],
      },
      attributes: ["id", "code", "status", "serviceName", "date", "time"],
      order: [["createdAt", "DESC"]],
    });

    if (booking) {
      linkedBooking = booking;
    }

    return successResponse(
      res,
      {
        ...enquiry.toJSON(),
        booking: linkedBooking,
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

    await transaction.commit();

    return successResponse(
      res,
      {
        enquiry,
        notification: {
          client: {
            to: `client:${enquiry.clientPhone}`,
            title: "Our care team replied",
            body: noteText || "Open your help request in the app to view our recommendation.",
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
  getAdminEnquiries,
  getAdminEnquiryById,
  updateAdminEnquiry,
};
