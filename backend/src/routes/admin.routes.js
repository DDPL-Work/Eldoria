const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth.middleware");
const { uploadStaffFiles } = require("../middlewares/upload.middleware");
const {
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
} = require("../controllers/admin.controller");
const { getDashboardData } = require("../controllers/dashboard.controller");
const {
  createAdminBooking,
  confirmBooking,
  assignStaffToBooking,
  unassignStaffFromBooking,
  updateBookingStatus,
  getAvailableStaffForBooking,
  getStaffVisitReports,
} = require("../controllers/booking.controller");

const {
  getCities,
  getCityById,
  createCity,
  updateCity,
  toggleCityStatus,
  deleteCity,
} = require("../controllers/city.controller");

const {
  getAdminServices,
  getAdminServiceById,
  createService,
  updateService,
  toggleServiceStatus,
  reorderServices,
  deleteService,
  updateCategory,
  createCategory,
  toggleCategoryStatus,
  deleteCategory,
} = require("../controllers/service.controller");
const {
  getAdminEnquiries,
  getAdminEnquiryById,
  updateAdminEnquiry,
  bookEnquiryRecommendation,
} = require("../controllers/enquiry.controller");

// Dashboard care-desk metrics & data
router.get("/dashboard", verifyToken, requireAdmin, getDashboardData);

// Bookings management routes
router.get("/bookings/all", verifyToken, requireAdmin, getBookings);

router.post(
  "/booking/create",
  verifyToken,
  requireAdmin,
  uploadStaffFiles,
  createAdminBooking,
);

router.get("/booking/:id", verifyToken, requireAdmin, getBookingById);
router.get(
  "/booking/:id/report",
  verifyToken,
  requireAdmin,
  getStaffVisitReports,
);

router.get(
  "/booking/:id/available-staff",
  verifyToken,
  requireAdmin,
  getAvailableStaffForBooking,
);

router.patch("/booking/:id/confirm", verifyToken, requireAdmin, confirmBooking);

router.patch(
  "/booking/:id/assign",
  verifyToken,
  requireAdmin,
  assignStaffToBooking,
);

router.patch(
  "/booking/:id/unassign",
  verifyToken,
  requireAdmin,
  unassignStaffFromBooking,
);

router.patch(
  "/booking/:id/status",
  verifyToken,
  requireAdmin,
  updateBookingStatus,
);

// City management CRUD routes
router.get("/cities", verifyToken, requireAdmin, getCities);
router.get("/cities/:id", verifyToken, requireAdmin, getCityById);
router.post("/cities", verifyToken, requireAdmin, createCity);
router.patch("/cities/:id", verifyToken, requireAdmin, updateCity);
router.patch("/cities/:id/status", verifyToken, requireAdmin, toggleCityStatus);
router.delete("/cities/:id", verifyToken, requireAdmin, deleteCity);

// Service & Category catalog management CRUD routes
router.get("/services", verifyToken, requireAdmin, getAdminServices);
router.get("/services/:id", verifyToken, requireAdmin, getAdminServiceById);
router.post("/service/create", verifyToken, requireAdmin, createService);
router.post("/services/create", verifyToken, requireAdmin, createService);
router.post("/services", verifyToken, requireAdmin, createService);
router.patch("/services/reorder", verifyToken, requireAdmin, reorderServices);
router.patch(
  "/services/:id/reorder",
  verifyToken,
  requireAdmin,
  reorderServices,
);
router.patch(
  "/service/:id/status",
  verifyToken,
  requireAdmin,
  toggleServiceStatus,
);
router.patch("/service/:id/update", verifyToken, requireAdmin, updateService);
router.put("/services/:id", verifyToken, requireAdmin, updateService);
router.delete("/service/:id/delete", verifyToken, requireAdmin, deleteService);

// Category operations (dedicated & embedded categories)
router.post(
  "/services/categories/create",
  verifyToken,
  requireAdmin,
  createCategory,
);
router.patch(
  "/services/categories/:category/status",
  verifyToken,
  requireAdmin,
  toggleCategoryStatus,
);
router.patch(
  "/services/categories/:category",
  verifyToken,
  requireAdmin,
  updateCategory,
);
router.delete(
  "/services/categories/:category/delete",
  verifyToken,
  requireAdmin,
  deleteCategory,
);

// Staff creation by Admin (Direct onboarding without OTP or document verification)
router.post("/staff/create", verifyToken, requireAdmin, createAdminStaff);

// Staff registration request & staff management routes (same staff, no separate listing)
router.get("/staff-requests", verifyToken, requireAdmin, getStaffRequests);
router.get(
  "/staff-requests/:id",
  verifyToken,
  requireAdmin,
  getStaffRequestById,
);

// Verify individual document or update docChecks prior to approval/rejection
router.patch(
  "/staff-requests/:id/verify-document",
  verifyToken,
  requireAdmin,
  verifyStaffDocument,
);

// Verify / approve staff registration request
router.patch(
  "/staff-requests/:id/approve",
  verifyToken,
  requireAdmin,
  verifyStaffRequest,
);

// Request changes on staff application (Reference: Onboarding.jsx / ApplicationDetail.jsx)
router.patch(
  "/staff-requests/:id/request-changes",
  verifyToken,
  requireAdmin,
  requestStaffChanges,
);

// Reject staff registration request
router.patch(
  "/staff-requests/:id/reject",
  verifyToken,
  requireAdmin,
  rejectStaffRequest,
);

// Move back to review ('pending') / revoke decision
router.patch(
  "/staff-requests/:id/revoke",
  verifyToken,
  requireAdmin,
  revokeStaffRequestDecision,
);
router.patch(
  "/staff-requests/:id/pending",
  verifyToken,
  requireAdmin,
  revokeStaffRequestDecision,
);

// Client management routes
router.get("/clients", verifyToken, requireAdmin, getClients);
router.get(
  "/clients/:clientId",
  verifyToken,
  requireAdmin,
  getClientByClientId,
);
router.get("/client/:clientId", verifyToken, requireAdmin, getClientByClientId);

// Help requests (Enquiries) management routes ("Not sure what care you need?")

router.get("/enquiries/all", verifyToken, requireAdmin, getAdminEnquiries);
router.get("/enquiry/:id", verifyToken, requireAdmin, getAdminEnquiryById);
router.patch(
  "/enquiry/:id/status",
  verifyToken,
  requireAdmin,
  updateAdminEnquiry,
);
router.patch(
  "/enquiry/:id/recommend",
  verifyToken,
  requireAdmin,
  updateAdminEnquiry,
);

// Admin converts enquiry directly into a booking
router.post(
  "/enquiry/:id/convert-to-booking",
  verifyToken,
  requireAdmin,
  bookEnquiryRecommendation,
);
router.post(
  "/enquiry/:id/book",
  verifyToken,
  requireAdmin,
  bookEnquiryRecommendation,
);


// Coming Soon "Notify Me" Subscribers & Broadcast Notification management routes
const {
  getAdminNotifyRequests,
  broadcastComingSoonLaunch,
  deleteAdminNotifyRequest,
} = require("../controllers/notification.controller");

router.get("/notify-me", verifyToken, requireAdmin, getAdminNotifyRequests);
router.post(
  "/notify-me/broadcast",
  verifyToken,
  requireAdmin,
  broadcastComingSoonLaunch,
);
router.delete(
  "/notify-me/:id",
  verifyToken,
  requireAdmin,
  deleteAdminNotifyRequest,
);

module.exports = router;