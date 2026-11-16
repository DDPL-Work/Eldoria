const express = require("express");
const router = express.Router();
const { runBookingExpiryJob, getCronStatus } = require("../services/cron.service");
const { successResponse, errorResponse } = require("../utills/responseHandler");
const { verifyToken, requireAdmin } = require("../middlewares/auth.middleware");

/**
 * Middleware: Authenticates external cron pings via CRON_SECRET or Admin Bearer token
 */
const authenticateCronRequest = (req, res, next) => {
  const configuredSecret = (process.env.CRON_SECRET || "").trim();
  const headerSecret = (req.headers["x-cron-secret"] || "").trim();
  const authHeader = (req.headers.authorization || "").trim();

  // 1. Direct x-cron-secret header check
  if (configuredSecret && headerSecret && headerSecret === configuredSecret) {
    req.cronSource = "external_ping_secret_header";
    return next();
  }

  // 2. Bearer <CRON_SECRET> check
  if (configuredSecret && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken === configuredSecret) {
      req.cronSource = "external_ping_secret_bearer";
      return next();
    }
  }

  // 3. Fallback: Check if authorized admin user
  return verifyToken(req, res, () => {
    return requireAdmin(req, res, () => {
      req.cronSource = `admin_manual_${req.user?.name || req.user?.id || "admin"}`;
      next();
    });
  });
};

/**
 * 1. External Ping Trigger: Mark Overdue Bookings as Date Exceeded
 * POST /api/v1/cron/mark-date-exceeded
 * GET  /api/v1/cron/mark-date-exceeded
 */
const handleMarkDateExceeded = async (req, res) => {
  try {
    const { city } = req.body || req.query || {};
    const source = req.cronSource || "external_ping";

    const result = await runBookingExpiryJob(source, { city });

    return successResponse(
      res,
      result,
      `Processed overdue bookings successfully. ${result.updatedCount} booking(s) marked as date exceeded.`
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to process overdue bookings via cron trigger",
      500,
      error
    );
  }
};

router.post("/mark-date-exceeded", authenticateCronRequest, handleMarkDateExceeded);
router.get("/mark-date-exceeded", authenticateCronRequest, handleMarkDateExceeded);

/**
 * 2. Get Cron Telemetry and Last Execution Status
 * GET /api/v1/cron/status
 */
router.get("/status", authenticateCronRequest, (req, res) => {
  const status = getCronStatus();
  return successResponse(res, status, "Cron service status retrieved successfully");
});

module.exports = router;
