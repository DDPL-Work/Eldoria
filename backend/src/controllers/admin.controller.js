const { Op } = require("sequelize");
const { sequelize, User, Staff, Client, Booking } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");
const { generateStaffId } = require("../helpers/generateStaffID");
const {
  checkAndMarkDateExceededBookings,
  getDateExceededBookings: fetchDateExceededBookings,
} = require("../services/bookingExpiry.service");
const {
  processStaffAvailabilitySlots,
  hasAvailabilitySlotsInput,
} = require("../helpers/availabilitySlots.helper");


/**
 * Helper to build lookup condition by either primary key id or staffId string
 */
const buildStaffLookupCondition = (identifier) => {
  const isNumeric = !isNaN(Number(identifier));
  return isNumeric
    ? { [Op.or]: [{ id: Number(identifier) }, { staffId: String(identifier) }] }
    : { staffId: String(identifier) };
};

/**
 * Helper to build lookup condition by either primary key id or clientId string
 */
const buildClientLookupCondition = (identifier) => {
  const isNumeric = !isNaN(Number(identifier));
  return isNumeric
    ? { [Op.or]: [{ id: Number(identifier) }, { clientId: String(identifier) }] }
    : { clientId: String(identifier) };
};

/**
 * Helper to build lookup condition by either primary key id or booking code string
 */
const buildBookingLookupCondition = (identifier) => {
  const isNumeric = !isNaN(Number(identifier));
  return isNumeric
    ? { [Op.or]: [{ id: Number(identifier) }, { code: String(identifier) }] }
    : { code: String(identifier) };
};

/**
 * 1. Fetch staff registration requests (List with filter, search, & pagination)
 * GET /api/v1/admin/staff-requests
 */
const getStaffRequests = async (req, res) => {
  try {
    const {
      approval,
      docs,
      city,
      onDuty,
      search,
      page = 1,
      limit = 100,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNumber - 1) * pageSize;

    // Filters on Staff model
    const staffWhere = {};

    if (approval && approval !== "all") {
      staffWhere.approval = approval;
    }

    if (docs && docs !== "all") {
      staffWhere.docs = docs;
    }

    if (onDuty !== undefined && onDuty !== "all") {
      staffWhere.onDuty = onDuty === "true" || onDuty === true || onDuty === "1";
    }

    if (city) {
      staffWhere.city = { [Op.like]: `%${city.trim()}%` };
    }

    // Filters on User model
    const userWhere = {};

    // Search query across staffId, name, email, phone, qualification
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      staffWhere[Op.or] = [
        { staffId: { [Op.like]: searchTerm } },
        { city: { [Op.like]: searchTerm } },
        { qualification: { [Op.like]: searchTerm } },
        { regNo: { [Op.like]: searchTerm } },
        { "$user.name$": { [Op.like]: searchTerm } },
        { "$user.email$": { [Op.like]: searchTerm } },
        { "$user.phone$": { [Op.like]: searchTerm } },
      ];
    }

    const ALLOWED_STAFF_SORT = ['id', 'createdAt', 'updatedAt', 'staffId', 'city', 'approval', 'docs', 'onDuty', 'regNo'];
    const safeStaffSortBy = ALLOWED_STAFF_SORT.includes(sortBy) ? sortBy : 'createdAt';
    const safeStaffSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: staffRequests } = await Staff.findAndCountAll({
      where: staffWhere,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive", "createdAt"],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          required: false,
        },
      ],
      order: [[safeStaffSortBy, safeStaffSortOrder]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / pageSize);

    return successResponse(
      res,
      {
        requests: staffRequests,
        staff: staffRequests,
        pagination: {
          total: count,
          currentPage: pageNumber,
          totalPages,
          limit: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Staff registration requests fetched successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch staff registration requests",
      500,
      error,
    );
  }
};

/**
 * 2. Fetch a single staff registration request by ID or staffId
 * GET /api/v1/admin/staff-requests/:id
 */
const getStaffRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Staff request ID or staffId is required", 400);
    }

    const staffRequest = await Staff.findOne({
      where: buildStaffLookupCondition(id),
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive", "createdAt"],
        },
      ],
    });

    if (!staffRequest) {
      return errorResponse(res, "Staff registration request not found", 404);
    }

    return successResponse(
      res,
      staffRequest,
      "Staff registration request retrieved successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch staff registration request",
      500,
      error,
    );
  }
};

/**
 * Required document keys for staff registration verification (matching OB_DOCS in admin frontend)
 */
const REQUIRED_DOC_KEYS = ["photo", "idProof", "qualification"];

/**
 * Helper to apply document verification updates to a staff member's files and docChecks.
 * Supports:
 * - Specific document ID and status / verified flag
 * - Specific document key and status / verified flag
 * - Array of document objects: [{ id, docKey, status, verified, notes }]
 * - docChecks map: { photo: true, idProof: true, qualification: false }
 */
const applyDocumentUpdates = (currentFiles = {}, currentDocChecks = {}, updates = {}) => {
  const updatedFiles = { ...(currentFiles || {}) };
  const updatedDocChecks = { ...(currentDocChecks || {}) };

  const { docChecks, documents, docId, docKey, status, verified, notes } = updates;

  // 1. If explicit docChecks object was passed e.g. { photo: true, idProof: true }
  if (docChecks && typeof docChecks === "object") {
    Object.keys(docChecks).forEach((key) => {
      const isChecked = Boolean(docChecks[key]);
      updatedDocChecks[key] = isChecked;

      if (updatedFiles[key]) {
        updatedFiles[key] = {
          ...updatedFiles[key],
          verified: isChecked,
          status: isChecked ? "verified" : "pending",
          verifiedAt: isChecked ? new Date().toISOString() : null,
        };
      }
    });
  }

  // 2. If an array of documents was passed e.g. [{ id: "...", status: "verified", verified: true }]
  if (Array.isArray(documents)) {
    documents.forEach((d) => {
      if (!d) return;
      const targetKey = d.docKey || d.key;
      const targetId = d.id || d.docId;
      const isVerified = d.verified !== undefined ? Boolean(d.verified) : d.status === "verified";
      const docStatus = d.status || (isVerified ? "verified" : "pending");

      // Match by key or by document id
      let matchedKey = targetKey;
      if (!matchedKey && targetId) {
        matchedKey = Object.keys(updatedFiles).find(
          (k) =>
            updatedFiles[k]?.id === targetId ||
            String(updatedFiles[k]?.id) === String(targetId),
        );
      }

      if (matchedKey && updatedFiles[matchedKey]) {
        updatedFiles[matchedKey] = {
          ...updatedFiles[matchedKey],
          status: docStatus,
          verified: isVerified,
          verifiedAt: isVerified ? new Date().toISOString() : null,
          notes: d.notes !== undefined ? d.notes : updatedFiles[matchedKey].notes,
        };
        updatedDocChecks[matchedKey] = isVerified;
      }
    });
  }

  // 3. If single docId or docKey was passed
  if (docId || docKey) {
    let matchedKey = docKey;
    if (!matchedKey && docId) {
      matchedKey = Object.keys(updatedFiles).find(
        (k) =>
          updatedFiles[k]?.id === docId ||
          String(updatedFiles[k]?.id) === String(docId),
      );
    }

    const isVerified = verified !== undefined ? Boolean(verified) : status === "verified";
    const docStatus = status || (isVerified ? "verified" : "pending");

    if (matchedKey && updatedFiles[matchedKey]) {
      updatedFiles[matchedKey] = {
        ...updatedFiles[matchedKey],
        status: docStatus,
        verified: isVerified,
        verifiedAt: isVerified ? new Date().toISOString() : null,
        notes: notes !== undefined ? notes : updatedFiles[matchedKey].notes,
      };
      updatedDocChecks[matchedKey] = isVerified;
    }
  }

  // Compute overall docs verification status
  // Required documents: photo, idProof, qualification
  const allRequiredVerified = REQUIRED_DOC_KEYS.every((k) => updatedDocChecks[k] === true);
  const overallDocsStatus = allRequiredVerified ? "verified" : "pending";

  return {
    files: updatedFiles,
    docChecks: updatedDocChecks,
    docsStatus: overallDocsStatus,
    allRequiredVerified,
  };
};

/**
 * 3. Verify an individual document or update docChecks for a staff request
 * PATCH /api/v1/admin/staff-requests/:id/verify-document
 * Body accepts:
 *   - { docId, docKey, status, verified, notes }
 *   - { docChecks: { photo: true, idProof: false } }
 *   - { documents: [{ id, status, verified }] }
 */
const verifyStaffDocument = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    if (!id) {
      await transaction.rollback();
      return errorResponse(res, "Staff ID or request ID is required", 400);
    }

    const staff = await Staff.findOne({
      where: buildStaffLookupCondition(id),
      include: [{ model: User, as: "user" }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, "Staff registration request not found", 404);
    }

    const { files, docChecks, docsStatus, allRequiredVerified } = applyDocumentUpdates(
      staff.files,
      staff.docChecks,
      req.body,
    );

    await staff.update(
      {
        files,
        docChecks,
        docs: docsStatus,
      },
      { transaction },
    );

    await transaction.commit();

    const updatedStaff = await Staff.findOne({
      where: { id: staff.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive"],
        },
      ],
    });

    return successResponse(
      res,
      {
        staff: updatedStaff,
        docsStatus,
        allRequiredVerified,
      },
      "Staff document verification status updated successfully",
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to update staff document verification status",
      500,
      error,
    );
  }
};

/**
 * 4. Verify / Approve staff registration request
 * Receives document verification status from frontend along with document ID or docChecks
 * PATCH or POST /api/v1/admin/staff-requests/:id/approve
 */
const verifyStaffRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      notes,
      reviewNote,
      note,
      docsStatus: manualDocsStatus,
      docChecks,
      documents,
      docId,
      status,
      verified,
    } = req.body;

    const approvalNote = (reviewNote || note || notes || "").trim();

    if (!id) {
      await transaction.rollback();
      return errorResponse(res, "Staff ID or request ID is required", 400);
    }

    const staff = await Staff.findOne({
      where: buildStaffLookupCondition(id),
      include: [{ model: User, as: "user" }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, "Staff registration request not found", 404);
    }

    // Apply any document verification status passed from frontend
    const docUpdatePayload = { docChecks, documents, docId, status, verified };
    const hasDocUpdates = Boolean(
      docChecks || documents || docId || status !== undefined || verified !== undefined,
    );

    let finalFiles = staff.files;
    let finalDocChecks = staff.docChecks;
    let computedDocsStatus = staff.docs;

    if (hasDocUpdates) {
      const updateResult = applyDocumentUpdates(staff.files, staff.docChecks, docUpdatePayload);
      finalFiles = updateResult.files;
      finalDocChecks = updateResult.docChecks;
      computedDocsStatus = updateResult.docsStatus;
    } else if (!finalDocChecks || Object.keys(finalDocChecks).length === 0) {
      // If no docChecks were stored, mark all uploaded required docs as verified upon approval
      finalDocChecks = { ...(staff.docChecks || {}) };
      finalFiles = { ...(staff.files || {}) };
      REQUIRED_DOC_KEYS.forEach((k) => {
        finalDocChecks[k] = true;
        if (finalFiles[k]) {
          finalFiles[k] = {
            ...finalFiles[k],
            verified: true,
            status: "verified",
            verifiedAt: new Date().toISOString(),
          };
        }
      });
      computedDocsStatus = "verified";
    }

    const now = new Date();
    const historyItem = {
      at: now.toISOString(),
      status: "approved",
      by: "admin",
      note: approvalNote || "Application approved by care desk",
    };

    const existingHistory = Array.isArray(staff.appHistory) ? staff.appHistory : [];
    const updatedHistory = [...existingHistory, historyItem];

    // Update Staff profile to approved & docs to verified
    await staff.update(
      {
        approval: "approved",
        docs: manualDocsStatus || computedDocsStatus || "verified",
        approvedAt: now,
        reviewedAt: now,
        rejectedAt: null,
        reviewNote: approvalNote,
        notes: approvalNote || staff.notes,
        files: finalFiles,
        docChecks: finalDocChecks,
        appHistory: updatedHistory,
      },
      { transaction },
    );

    // Ensure the associated user account is active
    if (staff.user) {
      await staff.user.update(
        {
          isActive: true,
        },
        { transaction },
      );
    }

    await transaction.commit();

    // Fetch refreshed record
    const updatedStaff = await Staff.findOne({
      where: { id: staff.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive"],
        },
      ],
    });

    return successResponse(
      res,
      updatedStaff,
      `Staff registration request approved successfully for ${updatedStaff.user?.name || updatedStaff.staffId}`,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to verify staff registration request",
      500,
      error,
    );
  }
};

/**
 * 5. Request Changes on staff registration application
 * Changes status to 'changes', saves reviewNote, reviewedAt, and appHistory.
 * Reference: Onboarding.jsx / ApplicationDetail.jsx handleRequestChanges
 * PATCH /api/v1/admin/staff-requests/:id/request-changes
 */
const requestStaffChanges = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      note,
      notes,
      reviewNote,
      reason,
      docChecks,
      documents,
      docId,
      status,
      verified,
    } = req.body;

    const changeNote = (note || notes || reviewNote || reason || "").trim();

    if (!id) {
      await transaction.rollback();
      return errorResponse(res, "Staff ID or request ID is required", 400);
    }

    if (!changeNote) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Please provide a note explaining what changes are requested (e.g. blurry ID photo, re-upload needed)",
        400,
      );
    }

    const staff = await Staff.findOne({
      where: buildStaffLookupCondition(id),
      include: [{ model: User, as: "user" }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, "Staff registration request not found", 404);
    }

    // Optionally apply docUpdates if provided
    let finalFiles = staff.files;
    let finalDocChecks = staff.docChecks;
    const hasDocUpdates = Boolean(
      docChecks || documents || docId || status !== undefined || verified !== undefined,
    );

    if (hasDocUpdates) {
      const updateResult = applyDocumentUpdates(staff.files, staff.docChecks, {
        docChecks,
        documents,
        docId,
        status,
        verified,
      });
      finalFiles = updateResult.files;
      finalDocChecks = updateResult.docChecks;
    }

    const now = new Date();
    const historyItem = {
      at: now.toISOString(),
      status: "changes",
      by: "admin",
      note: changeNote,
    };

    const existingHistory = Array.isArray(staff.appHistory) ? staff.appHistory : [];
    const updatedHistory = [...existingHistory, historyItem];

    // Update Staff profile to 'changes' status
    await staff.update(
      {
        approval: "changes",
        docs: "pending",
        reviewNote: changeNote,
        notes: changeNote,
        reviewedAt: now,
        files: finalFiles,
        docChecks: finalDocChecks,
        appHistory: updatedHistory,
      },
      { transaction },
    );

    await transaction.commit();

    // Fetch refreshed record
    const updatedStaff = await Staff.findOne({
      where: { id: staff.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive"],
        },
      ],
    });

    return successResponse(
      res,
      updatedStaff,
      `Changes requested successfully for ${updatedStaff.user?.name || updatedStaff.staffId}`,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to request changes on staff application",
      500,
      error,
    );
  }
};

/**
 * 6. Reject staff registration request
 * PATCH or POST /api/v1/admin/staff-requests/:id/reject
 */
const rejectStaffRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { reason, notes, note, reviewNote } = req.body;

    const rejectionReason = (
      notes ||
      reason ||
      reviewNote ||
      note ||
      "Application rejected by care desk"
    ).trim();

    if (!id) {
      await transaction.rollback();
      return errorResponse(res, "Staff ID or request ID is required", 400);
    }

    const staff = await Staff.findOne({
      where: buildStaffLookupCondition(id),
      include: [{ model: User, as: "user" }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, "Staff registration request not found", 404);
    }

    const now = new Date();
    const historyItem = {
      at: now.toISOString(),
      status: "rejected",
      by: "admin",
      note: rejectionReason,
    };

    const existingHistory = Array.isArray(staff.appHistory) ? staff.appHistory : [];
    const updatedHistory = [...existingHistory, historyItem];

    // Update Staff profile to rejected
    await staff.update(
      {
        approval: "rejected",
        docs: "rejected",
        rejectedAt: now,
        reviewedAt: now,
        reviewNote: rejectionReason,
        notes: rejectionReason,
        appHistory: updatedHistory,
      },
      { transaction },
    );

    // Deactivate user login access upon rejection
    if (staff.user) {
      await staff.user.update(
        {
          isActive: false,
        },
        { transaction },
      );
    }

    await transaction.commit();

    // Fetch refreshed record
    const updatedStaff = await Staff.findOne({
      where: { id: staff.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive"],
        },
      ],
    });

    return successResponse(
      res,
      updatedStaff,
      `Staff registration request rejected for ${updatedStaff.user?.name || updatedStaff.staffId}`,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to reject staff registration request",
      500,
      error,
    );
  }
};

/**
 * 7. Revoke decision / move application back to review ('pending')
 * Reference: ApplicationDetail.jsx handleRevoke
 * PATCH /api/v1/admin/staff-requests/:id/revoke
 */
const revokeStaffRequestDecision = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { notes, note, reason } = req.body || {};

    const revokeNote = (note || notes || reason || "Moved back to review by the care desk").trim();

    if (!id) {
      await transaction.rollback();
      return errorResponse(res, "Staff ID or request ID is required", 400);
    }

    const staff = await Staff.findOne({
      where: buildStaffLookupCondition(id),
      include: [{ model: User, as: "user" }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, "Staff registration request not found", 404);
    }

    const now = new Date();
    const historyItem = {
      at: now.toISOString(),
      status: "pending",
      by: "admin",
      note: revokeNote,
    };

    const existingHistory = Array.isArray(staff.appHistory) ? staff.appHistory : [];
    const updatedHistory = [...existingHistory, historyItem];

    await staff.update(
      {
        approval: "pending",
        docs: "pending",
        approvedAt: null,
        rejectedAt: null,
        reviewedAt: now,
        reviewNote: revokeNote,
        appHistory: updatedHistory,
      },
      { transaction },
    );

    await transaction.commit();

    const updatedStaff = await Staff.findOne({
      where: { id: staff.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive"],
        },
      ],
    });

    return successResponse(
      res,
      updatedStaff,
      `Staff application moved back to review for ${updatedStaff.user?.name || updatedStaff.staffId}`,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to revoke staff decision",
      500,
      error,
    );
  }
};

/**
 * 4a. Create Staff from Admin Dashboard
 * Directly creates and onboards staff without OTP verification or document verification.
 * Staff gets created and approved immediately.
 * POST /api/v1/admin/staff/create
 * POST /api/v1/admin/staff
 * POST /api/v1/admin/staff-requests/create
 * POST /api/v1/admin/staff-requests
 */
const createAdminStaff = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.body || typeof req.body !== "object" || Object.keys(req.body).length === 0) {
      await transaction.rollback();
      return errorResponse(res, "Request payload cannot be empty", 400);
    }

    const {
      name,
      phone,
      email,
      role, // from admin frontend, e.g. "GNM Nurse"
      qualification, // optional explicit qualification
      city,
      area,
      address,
      skills,
      docs, // defaults to "verified"
      onDuty, // defaults to true
      dob,
      gender,
      regNo,
      experience,
      experienceYears,
      language,
      languages,
      availability,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      files,
      notes,
    } = req.body;

    // 1. Validate required primary fields (name & phone)
    if (!name || !String(name).trim()) {
      await transaction.rollback();
      return errorResponse(res, "Full name is required", 400);
    }

    if (!phone) {
      await transaction.rollback();
      return errorResponse(res, "Phone number is required", 400);
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).replace(/[^\d+]/g, "").trim();

    if (cleanPhone.length < 10) {
      await transaction.rollback();
      return errorResponse(res, "Please provide a valid 10-digit mobile number", 400);
    }

    // 2. Validate email if provided
    let cleanEmail = null;
    if (email && String(email).trim()) {
      cleanEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        await transaction.rollback();
        return errorResponse(res, "Please provide a valid email address", 400);
      }

      // Check if email is already taken by another user
      const existingEmail = await User.findOne({
        where: { email: cleanEmail },
        transaction,
      });
      if (existingEmail) {
        await transaction.rollback();
        return errorResponse(
          res,
          `A user with email '${cleanEmail}' is already registered (${existingEmail.name}, ${existingEmail.role})`,
          409,
        );
      }
    }

    // 3. Check for existing phone number across users
    const existingUser = await User.findOne({
      where: { phone: cleanPhone },
      include: [{ model: Staff, as: "staffProfile", required: false }],
      transaction,
    });

    if (existingUser) {
      if (existingUser.role !== "staff") {
        await transaction.rollback();
        return errorResponse(
          res,
          `This phone number is already registered under '${existingUser.role}' portal (${existingUser.name}).`,
          409,
        );
      }

      // If user is already a staff and has an existing staff profile that is active/approved
      if (existingUser.staffProfile && existingUser.staffProfile.approval === "approved") {
        await transaction.rollback();
        return errorResponse(
          res,
          `A staff member with this phone number is already registered and onboarded (${existingUser.name}, ${existingUser.staffId}).`,
          409,
        );
      }
    }

    // 4. City Hub Normalization
    const CITY_MAP = {
      mum: "Mumbai",
      del: "Delhi NCR",
      blr: "Bengaluru",
      pune: "Pune",
      mumbai: "Mumbai",
      delhi: "Delhi NCR",
      bangalore: "Bengaluru",
    };
    const rawCity = String(city || "Mumbai").trim();
    const cleanCity = CITY_MAP[rawCity.toLowerCase()] || rawCity;

    // 5. Gender Normalization
    let normalizedGender = "female";
    if (gender && ["male", "female", "others"].includes(String(gender).toLowerCase().trim())) {
      normalizedGender = String(gender).toLowerCase().trim();
    } else if (cleanName.toLowerCase().startsWith("sister")) {
      normalizedGender = "female";
    } else if (cleanName.toLowerCase().startsWith("mr.") || cleanName.toLowerCase().startsWith("brother")) {
      normalizedGender = "male";
    }

    // 6. Generate unique Staff ID (ELDOSF26...)
    const staffId = await generateStaffId(cleanCity, normalizedGender, transaction);

    // 7. Area & Address
    const cleanArea = String(area || cleanCity).trim();
    const cleanAddress = String(address || `${cleanArea}, ${cleanCity}`).trim();

    // 8. Role & Qualification
    const cleanQualification = String(qualification || role || "GNM Nurse").trim();

    // 9. Registration Number
    let cleanRegNo = regNo && String(regNo).trim();
    if (!cleanRegNo) {
      cleanRegNo = `REG-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    // Check regNo uniqueness
    const regNoConflict = await Staff.findOne({
      where: { regNo: cleanRegNo },
      transaction,
    });
    if (regNoConflict) {
      cleanRegNo = `REG-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    // 10. Experience
    let cleanExperience = "2+ years";
    if (experience && String(experience).trim()) {
      cleanExperience = String(experience).trim();
    } else if (experienceYears) {
      cleanExperience = `${experienceYears} years`;
    }

    // 11. Skills Parsing
    let parsedSkills = [];
    if (Array.isArray(skills)) {
      parsedSkills = skills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof skills === "string" && skills.trim()) {
      parsedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (parsedSkills.length === 0) {
      parsedSkills = ["Elder care", "Basic nursing care"];
    }

    // 12. Languages Parsing
    let parsedLanguages = ["Hindi", "English"];
    const inputLanguages = language || languages;
    if (Array.isArray(inputLanguages)) {
      parsedLanguages = inputLanguages.map((l) => String(l).trim()).filter(Boolean);
    } else if (typeof inputLanguages === "string" && inputLanguages.trim()) {
      parsedLanguages = inputLanguages.split(",").map((l) => l.trim()).filter(Boolean);
    }

    // 13. Availability Parsing
    let parsedAvailability = ["full_time", "day_shift", "night_shift"];
    if (Array.isArray(availability)) {
      parsedAvailability = availability.map((a) => String(a).trim()).filter(Boolean);
    } else if (typeof availability === "string" && availability.trim()) {
      parsedAvailability = availability.split(",").map((a) => a.trim()).filter(Boolean);
    }

    // 14. DOB
    const cleanDob = dob ? String(dob).trim() : "1995-01-01";

    // 15. Onboarding Status (Directly approved & verified, no verification needed)
    const cleanDocs = docs === "pending" ? "pending" : "verified";
    const isStaffOnDuty = onDuty !== undefined ? Boolean(onDuty) : true;
    const adminIdentifier = req.user?.email || req.user?.name || "admin";
    const now = new Date();

    // 16. Create User record (or update if orphaned staff user existed)
    let userRecord = existingUser;
    if (!userRecord) {
      userRecord = await User.create(
        {
          staffId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: "staff",
          isActive: true,
        },
        { transaction },
      );
    } else {
      userRecord.staffId = staffId;
      userRecord.name = cleanName;
      if (cleanEmail) userRecord.email = cleanEmail;
      userRecord.isActive = true;
      await userRecord.save({ transaction });
    }

    // 17. Create Staff record (approved & verified directly without OTP or document check)
    const staffRecord = await Staff.create(
      {
        staffId,
        dob: cleanDob,
        gender: normalizedGender,
        city: cleanCity,
        area: cleanArea,
        address: cleanAddress,
        qualification: cleanQualification,
        regNo: cleanRegNo,
        experience: cleanExperience,
        skills: parsedSkills,
        language: parsedLanguages,
        availability: parsedAvailability,
        availabilitySlots: hasAvailabilitySlotsInput(req.body)
          ? processStaffAvailabilitySlots(req.body, [])
          : [],
        emergencyName: emergencyName ? String(emergencyName).trim() : null,
        emergencyPhone: emergencyPhone ? String(emergencyPhone).replace(/[^\d+]/g, "").trim() : null,
        emergencyRelation: emergencyRelation ? String(emergencyRelation).trim() : null,
        files: files || {},
        applied: true,
        approval: "approved",
        registrationStatus: "approved",
        docs: cleanDocs,
        docChecks: {
          photo: true,
          idProof: true,
          qualification: true,
        },
        onDuty: isStaffOnDuty,
        submittedAt: now,
        approvedAt: now,
        appHistory: [
          {
            at: now.toISOString(),
            status: "approved",
            by: adminIdentifier,
            note: "Staff directly created and onboarded by admin",
          },
        ],
        notes: notes ? String(notes).trim() : null,
      },
      { transaction },
    );

    await transaction.commit();

    // 18. Refetch created staff with User relation
    const fullStaff = await Staff.findOne({
      where: { id: staffRecord.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive", "createdAt"],
        },
      ],
    });

    return successResponse(
      res,
      fullStaff,
      `Staff member '${cleanName}' created and onboarded successfully`,
      201,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to create staff member", 500, error);
  }
};

/**
 * 5. Fetch clients (List with filters, search, & pagination)
 * GET /api/v1/admin/clients
 */
const getClients = async (req, res) => {
  try {
    const {
      status,
      city,
      area,
      service,
      search,
      page = 1,
      limit = 100,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNumber - 1) * pageSize;

    // Filters on Client model
    const clientWhere = {};

    if (status && status !== "all") {
      clientWhere.status = status;
    }

    if (city && city !== "all") {
      clientWhere.city = { [Op.like]: `%${city.trim().toLowerCase()}%` };
    }

    if (area && area !== "all") {
      clientWhere.area = { [Op.like]: `%${area.trim()}%` };
    }

    if (service && service !== "all") {
      clientWhere.requiredService = { [Op.like]: `%${service.trim()}%` };
    }

    // Search query across clientId, patientName, city, area, emergencyPhone, and user details
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      clientWhere[Op.or] = [
        { clientId: { [Op.like]: searchTerm } },
        { patientName: { [Op.like]: searchTerm } },
        { city: { [Op.like]: searchTerm } },
        { area: { [Op.like]: searchTerm } },
        { requiredService: { [Op.like]: searchTerm } },
        { emergencyPhone: { [Op.like]: searchTerm } },
        { "$user.name$": { [Op.like]: searchTerm } },
        { "$user.email$": { [Op.like]: searchTerm } },
        { "$user.phone$": { [Op.like]: searchTerm } },
      ];
    }

    const ALLOWED_CLIENT_SORT = ['id', 'createdAt', 'updatedAt', 'city', 'clientId'];
    const safeClientSortBy = ALLOWED_CLIENT_SORT.includes(sortBy) ? sortBy : 'createdAt';
    const safeClientSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: clients } = await Client.findAndCountAll({
      where: clientWhere,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "role", "isActive", "createdAt"],
          required: false,
        },
      ],
      order: [[safeClientSortBy, safeClientSortOrder]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / pageSize);

    return successResponse(
      res,
      {
        clients,
        pagination: {
          total: count,
          currentPage: pageNumber,
          totalPages,
          limit: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Clients fetched successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch clients",
      500,
      error,
    );
  }
};

/**
 * 6. Fetch single client by clientId or primary key id
 * Clean non-redundant response: Client personal details followed by bookings with patient information
 * GET /api/v1/admin/clients/:clientId
 */
const getClientByClientId = async (req, res) => {
  try {
    const clientIdParam = req.params.clientId || req.params.clientID || req.params.id;

    if (!clientIdParam) {
      return errorResponse(res, "Client ID or clientId string is required", 400);
    }

    // 1. Fetch Client profile with associated User account
    const client = await Client.findOne({
      where: buildClientLookupCondition(clientIdParam),
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "role", "isActive", "createdAt", "updatedAt"],
        },
      ],
    });

    if (!client) {
      return errorResponse(res, `Client '${clientIdParam}' not found`, 404);
    }

    // 2. Build matching criteria for all bookings associated with this client
    const bookingOrConditions = [];
    if (client.clientId) {
      bookingOrConditions.push({ clientId: client.clientId });
    }
    bookingOrConditions.push({ clientId: String(client.id) });
    if (client.user && client.user.phone) {
      bookingOrConditions.push({ clientPhone: client.user.phone });
    }
    if (client.emergencyPhone) {
      bookingOrConditions.push({ clientPhone: client.emergencyPhone });
    }

    // 3. Fetch all bookings for this client
    const bookings = await Booking.findAll({
      where: {
        [Op.or]: bookingOrConditions,
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Staff,
          as: "assignedStaff",
          required: false,
          attributes: ["id", "staffId", "city", "area", "qualification"],
          include: [
            {
              model: User,
              as: "user",
              required: false,
              attributes: ["id", "name", "email", "phone"],
            },
          ],
        },
      ],
    });

    // 4. Format bookings — patient details depend on each specific booking
    const formattedBookings = bookings.map((b) => {
      const bJson = b.toJSON ? b.toJSON() : b;
      return {
        id: bJson.id,
        code: bJson.code,
        serviceId: bJson.serviceId,
        service: bJson.service,
        serviceName: bJson.serviceName,
        categoryId: bJson.categoryId,
        category: bJson.category,
        plan: bJson.plan,
        date: bJson.date,
        time: bJson.time,
        startDate: bJson.startDate || bJson.date,
        endDate: bJson.endDate || bJson.startDate || bJson.date,
        startTime: bJson.startTime || bJson.time,
        endTime: bJson.endTime || null,
        status: bJson.status,
        price: bJson.price,
        source: bJson.source,
        notes: bJson.notes,
        patient: {
          name: bJson.patientName,
          age: bJson.patientAge,
          gender: bJson.patientGender,
          relation: bJson.relation,
          address: bJson.address,
          area: bJson.area,
          city: bJson.city,
        },
        staffId: bJson.staffId,
        assignedStaff: bJson.assignedStaff
          ? {
              id: bJson.assignedStaff.id,
              staffId: bJson.assignedStaff.staffId,
              name: bJson.assignedStaff.user?.name || "Assigned Caregiver",
              phone: bJson.assignedStaff.user?.phone || null,
              qualification: bJson.assignedStaff.qualification,
              city: bJson.assignedStaff.city,
            }
          : null,
        confirmedBy: bJson.confirmedBy,
        confirmedAt: bJson.confirmedAt,
        assignedBy: bJson.assignedBy,
        assignedAt: bJson.assignedAt,
        checkInAt: bJson.checkInAt,
        checkOutAt: bJson.checkOutAt,
        tasks: bJson.tasks || [],
        files: bJson.files || [],
        reports: bJson.reports || [],
        history: bJson.history || [],
        createdAt: bJson.createdAt,
        updatedAt: bJson.updatedAt,
      };
    });

    // 5. Unique patient summary derived from the client's bookings
    const patientMap = new Map();
    formattedBookings.forEach((b) => {
      if (b.patient && b.patient.name) {
        const key = b.patient.name.trim().toLowerCase();
        if (!patientMap.has(key)) {
          patientMap.set(key, {
            name: b.patient.name,
            age: b.patient.age,
            gender: b.patient.gender,
            relation: b.patient.relation,
            totalBookings: 1,
            lastBookingCode: b.code,
          });
        } else {
          patientMap.get(key).totalBookings += 1;
        }
      }
    });
    const patients = Array.from(patientMap.values());

    // 6. Clean Client personal details (strictly client identity, no patient data)
    const clientPersonalDetails = {
      id: client.id,
      clientId: client.clientId,
      userId: client.userId,
      name: client.user?.name || "Client",
      email: client.user?.email || null,
      phone: client.user?.phone || client.emergencyPhone || null,
      city: client.city,
      area: client.area,
      address: client.address,
      pincode: client.pincode,
      landmark: client.landmark,
      source: client.source,
      preferredLanguage: client.preferredLanguage,
      status: client.status,
      emergencyContact: {
        name: client.emergencyName || null,
        phone: client.emergencyPhone || null,
        relation: client.emergencyRelation || null,
      },
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };

    const responseData = {
      client: clientPersonalDetails,
      patients,
      totalBookings: formattedBookings.length,
      bookings: formattedBookings,
    };

    return successResponse(
      res,
      responseData,
      "Client details and bookings retrieved successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch client details",
      500,
      error,
    );
  }
};

/**
 * 7. Fetch bookings (List with filters, search, & pagination)
 * GET /api/v1/admin/bookings
 */
const getBookings = async (req, res) => {
  try {
    const {
      status,
      city,
      area,
      service,
      date,
      staffId,
      search,
      page = 1,
      limit = 100,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Automatically check and mark overdue unconfirmed bookings as 'date_exceeded'
    await checkAndMarkDateExceededBookings({ city }).catch((err) => {
      console.warn("Date exceeded check in getBookings warning:", err.message);
    });

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNumber - 1) * pageSize;

    const todayStr = new Date().toISOString().split("T")[0];

    const bookingWhere = {};
    const andConditions = [];

    if (status && status !== "all") {
      if (status === "date_exceeded") {
        andConditions.push({
          [Op.or]: [
            { status: "date_exceeded" },
            {
              [Op.or]: [
                { endDate: { [Op.ne]: null, [Op.lt]: todayStr } },
                { endDate: null, date: { [Op.lt]: todayStr } },
              ],
              status: { [Op.notIn]: ["completed", "cancelled"] },
            },
          ],
        });
      } else {
        bookingWhere.status = status;
      }
    }

    if (city && city !== "all") {
      bookingWhere.city = { [Op.like]: `%${city.trim().toLowerCase()}%` };
    }

    if (area && area !== "all") {
      bookingWhere.area = { [Op.like]: `%${area.trim()}%` };
    }

    if (service && service !== "all") {
      bookingWhere.service = { [Op.like]: `%${service.trim()}%` };
    }

    if (date) {
      bookingWhere.date = date.trim();
    }

    if (staffId && staffId !== "all") {
      bookingWhere.staffId = staffId.trim();
    }

    // Search query across code, clientName, clientPhone, patientName, address, serviceName, notes
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      andConditions.push({
        [Op.or]: [
          { code: { [Op.like]: searchTerm } },
          { clientName: { [Op.like]: searchTerm } },
          { clientPhone: { [Op.like]: searchTerm } },
          { patientName: { [Op.like]: searchTerm } },
          { address: { [Op.like]: searchTerm } },
          { serviceName: { [Op.like]: searchTerm } },
          { notes: { [Op.like]: searchTerm } },
          { staffId: { [Op.like]: searchTerm } },
        ],
      });
    }

    if (andConditions.length > 0) {
      bookingWhere[Op.and] = andConditions;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: bookingWhere,
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
      order: [[
        ['id', 'createdAt', 'updatedAt', 'bookingId', 'status', 'startDate', 'endDate', 'totalAmount', 'date'].includes(sortBy) ? sortBy : 'createdAt',
        String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
      ]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / pageSize);

    const normalizedBookings = (bookings || []).map((b) => {
      const bObj = b.toJSON ? b.toJSON() : { ...b };
      bObj.startDate = bObj.startDate || bObj.date || null;
      bObj.endDate = bObj.endDate || bObj.startDate || bObj.date || null;

      let sTime = (bObj.startTime || "").trim();
      let eTime = (bObj.endTime || "").trim();
      if ((!sTime || !eTime) && bObj.time && typeof bObj.time === "string" && (bObj.time.includes("-") || bObj.time.includes("–") || bObj.time.includes("—"))) {
        const parts = bObj.time.split(/[-–—]/).map((t) => t.trim());
        if (parts.length >= 2) {
          if (!sTime) sTime = parts[0];
          if (!eTime) eTime = parts[1];
        }
      }
      bObj.startTime = sTime || bObj.time || null;
      bObj.endTime = eTime || null;

      const cmpDate = bObj.endDate || bObj.date;
      if (cmpDate && cmpDate < todayStr && !["completed", "cancelled"].includes(bObj.status)) {
        bObj.status = "date_exceeded";
      }
      return bObj;
    });

    return successResponse(
      res,
      {
        bookings: normalizedBookings,
        pagination: {
          total: count,
          currentPage: pageNumber,
          totalPages,
          limit: pageSize,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Bookings fetched successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch bookings",
      500,
      error,
    );
  }
};

/**
 * 8. Fetch single booking by primary key id or code string
 * GET /api/v1/admin/bookings/:id
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Booking ID or code is required", 400);
    }

    const booking = await Booking.findOne({
      where: buildBookingLookupCondition(id),
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

    if (!booking) {
      return errorResponse(res, `Booking '${id}' not found`, 404);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const bObj = booking.toJSON ? booking.toJSON() : { ...booking };

    // Guarantee that startDate, endDate, startTime, and endTime are always populated and clean
    bObj.startDate = bObj.startDate || bObj.date || null;
    bObj.endDate = bObj.endDate || bObj.startDate || bObj.date || null;

    let sTime = (bObj.startTime || "").trim();
    let eTime = (bObj.endTime || "").trim();
    if ((!sTime || !eTime) && bObj.time && typeof bObj.time === "string" && (bObj.time.includes("-") || bObj.time.includes("–") || bObj.time.includes("—"))) {
      const parts = bObj.time.split(/[-–—]/).map((t) => t.trim());
      if (parts.length >= 2) {
        if (!sTime) sTime = parts[0];
        if (!eTime) eTime = parts[1];
      }
    }
    bObj.startTime = sTime || bObj.time || null;
    bObj.endTime = eTime || null;

    const cmpDate = bObj.endDate || bObj.date;
    if (cmpDate && cmpDate < todayStr && !["completed", "cancelled"].includes(bObj.status)) {
      bObj.status = "date_exceeded";
    }

    return successResponse(
      res,
      bObj,
      "Booking details retrieved successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch booking details",
      500,
      error,
    );
  }
};

/**
 * 7.1 Process and mark all overdue unconfirmed bookings as 'date_exceeded'
 * POST /api/v1/admin/bookings/mark-date-exceeded
 */
const markDateExceededBookings = async (req, res) => {
  try {
    const { city } = req.body || req.query || {};
    const result = await checkAndMarkDateExceededBookings({ city });

    return successResponse(
      res,
      result,
      `Processed date-exceeded bookings successfully. ${result.updatedCount} booking(s) marked as date exceeded.`
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to mark date-exceeded bookings",
      500,
      error
    );
  }
};

/**
 * 7.2 Fetch all bookings with status 'date_exceeded'
 * GET /api/v1/admin/bookings/date-exceeded
 */
const getDateExceededBookings = async (req, res) => {
  try {
    const { city, search, page, limit } = req.query;
    const result = await fetchDateExceededBookings({ city, search, page, limit });

    return successResponse(
      res,
      result,
      "Date-exceeded bookings retrieved successfully"
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch date-exceeded bookings",
      500,
      error
    );
  }
};

const {
  getAdminEnquiries: getEnquiries,
  getAdminEnquiryById: getEnquiryById,
} = require("./enquiry.controller");

module.exports = {
  createAdminStaff,
  getStaffRequests,
  getStaffRequestById,
  verifyStaffDocument,
  verifyStaffRequest,
  requestStaffChanges,
  rejectStaffRequest,
  revokeStaffRequestDecision,
  getClients,
  getClientByClientId,
  getBookings,
  getBookingById,
  markDateExceededBookings,
  getDateExceededBookings,
  getEnquiries,
  getEnquiryById,
};