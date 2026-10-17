const express = require("express");
const router = express.Router();
const {
  optionalToken,
  verifyToken,
  requireAdmin,
} = require("../middlewares/auth.middleware");
const {
  cancelClientBooking,
  cancelAdminBooking,
} = require("../controllers/cancellation.controller");

// Client cancel booking endpoint (Only 'requested', 'confirmed', 'assigned' can be cancelled)
router.patch("/client/:id", optionalToken, cancelClientBooking);

// Admin cancel booking endpoint (Any active booking can be cancelled)
router.patch("/admin/:id", verifyToken, requireAdmin, cancelAdminBooking);


module.exports = router;
