const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth.middleware");
const {
  getStaffRequests,
  getStaffRequestById,
  verifyStaffRequest,
  rejectStaffRequest,
  getClients,
  getClientByClientId,
} = require("../controllers/admin.controller");

// Staff registration request management routes (supports both /staff-requests and /staff aliases)
router.get("/staff-requests", verifyToken, requireAdmin, getStaffRequests);
router.get("/staff-requests/:id", verifyToken, requireAdmin, getStaffRequestById);

// Verify / approve staff registration request (supports PATCH & POST)
router.patch("/staff-requests/:id/approve", verifyToken, requireAdmin, verifyStaffRequest);

// Reject staff registration request (supports PATCH & POST)
router.patch("/staff-requests/:id/reject", verifyToken, requireAdmin, rejectStaffRequest);

// Client management routes
router.get("/clients", verifyToken, requireAdmin, getClients);
router.get("/clients/:clientId", verifyToken, requireAdmin, getClientByClientId);
router.get("/client/:clientId", verifyToken, requireAdmin, getClientByClientId);

module.exports = router;

