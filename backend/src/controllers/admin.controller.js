const { Op } = require("sequelize");
const { sequelize, User, Staff, Client, Booking } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");

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
      search,
      page = 1,
      limit = 10,
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
      order: [[sortBy, sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / pageSize);

    return successResponse(
      res,
      {
        requests: staffRequests,
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
      limit = 10,
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
      order: [[sortBy, sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
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
 * GET /api/v1/admin/clients/:clientId
 */
const getClientByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return errorResponse(res, "Client ID or clientId string is required", 400);
    }

    const client = await Client.findOne({
      where: buildClientLookupCondition(clientId),
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "role", "isActive", "createdAt"],
        },
      ],
    });

    if (!client) {
      return errorResponse(res, `Client '${clientId}' not found`, 404);
    }

    return successResponse(
      res,
      client,
      "Client details retrieved successfully",
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
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNumber - 1) * pageSize;

    const bookingWhere = {};

    if (status && status !== "all") {
      bookingWhere.status = status;
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
      bookingWhere[Op.or] = [
        { code: { [Op.like]: searchTerm } },
        { clientName: { [Op.like]: searchTerm } },
        { clientPhone: { [Op.like]: searchTerm } },
        { patientName: { [Op.like]: searchTerm } },
        { address: { [Op.like]: searchTerm } },
        { serviceName: { [Op.like]: searchTerm } },
        { notes: { [Op.like]: searchTerm } },
        { staffId: { [Op.like]: searchTerm } },
      ];
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
      order: [[sortBy, sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / pageSize);

    return successResponse(
      res,
      {
        bookings,
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

    return successResponse(
      res,
      booking,
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

module.exports = {
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
};
