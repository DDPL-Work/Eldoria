const { Op } = require("sequelize");
const { sequelize, User, Staff, Client } = require("../database/models");
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
 * 3. Verify / Approve staff registration request
 * PATCH or POST /api/v1/admin/staff-requests/:id/verify
 */
const verifyStaffRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { notes, docsStatus = "verified" } = req.body;

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

    // Update Staff profile to approved & docs to verified
    await staff.update(
      {
        approval: "approved",
        docs: docsStatus,
        approvedAt: new Date(),
        rejectedAt: null,
        notes: notes !== undefined ? notes : staff.notes,
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
    await transaction.rollback();
    return errorResponse(
      res,
      error.message || "Failed to verify staff registration request",
      500,
      error,
    );
  }
};

/**
 * 4. Reject staff registration request
 * PATCH or POST /api/v1/admin/staff-requests/:id/reject
 */
const rejectStaffRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    const rejectionReason = notes || reason || "Application rejected by administrator";

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

    // Update Staff profile to rejected
    await staff.update(
      {
        approval: "rejected",
        docs: "rejected",
        rejectedAt: new Date(),
        notes: rejectionReason,
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
    await transaction.rollback();
    return errorResponse(
      res,
      error.message || "Failed to reject staff registration request",
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

module.exports = {
  getStaffRequests,
  getStaffRequestById,
  verifyStaffRequest,
  rejectStaffRequest,
  getClients,
  getClientByClientId,
};
