const express = require("express");
const router = express.Router();
const {
  clientSendOtp,
  clientVerifyOtp,
  clientRegistration,
  getClientProfile,
  updateClientProfile,
} = require("../controllers/client.controller");
const { verifyToken, requireClient } = require("../middlewares/auth.middleware");

const { optionalToken } = require("../middlewares/auth.middleware");
const {
  createClientBooking,
  getClientBookings,
  getClientBookingById,
  getClientBookingStatus,
  getStaffVisitReports,
} = require("../controllers/booking.controller");
const {
  createClientEnquiry,
  getClientEnquiries,
  getClientEnquiryById,
} = require("../controllers/enquiry.controller");
const { uploadStaffFiles } = require("../middlewares/upload.middleware");

// Step 1: Send OTP to phone
router.post("/send-otp", clientSendOtp);

// Step 2: Verify OTP
//  - If registered: direct login with token
//  - If not registered: returns verificationToken for Step 3
router.post("/verify-otp", clientVerifyOtp);

// Step 3: Complete registration (requires phone, verificationToken, city, area)
router.post("/register", clientRegistration);

// Convenience login aliases
router.post("/login/send-otp", clientSendOtp);
router.post("/login/verify-otp", clientVerifyOtp);
router.post("/login", clientVerifyOtp);

// Client Profile management (authenticated)
router.get("/profile", verifyToken, requireClient, getClientProfile);
router.patch("/profile", verifyToken, requireClient, updateClientProfile);

// Operational cities route for client location picker
const { getPublicLiveCities } = require("../controllers/city.controller");
router.get("/cities", getPublicLiveCities);

// Client Services catalog routes (Location-aware)
const {
  getClientServices,
  getClientCategories,
  getPublicServiceById,
} = require("../controllers/service.controller");

router.get("/services", optionalToken, getClientServices);
router.get("/services/categories", optionalToken, getClientCategories);
router.get("/services/:id", optionalToken, getPublicServiceById);

// Client Booking flow routes (supports multipart/form-data medical history files upload)
router.post("/booking/create", optionalToken, uploadStaffFiles, createClientBooking);
router.get("/bookings", optionalToken, getClientBookings);

// Booking status & live tracking routes (with and without :id)
router.get("/booking/status", optionalToken, getClientBookingStatus);
router.get("/booking/track", optionalToken, getClientBookingStatus);
router.get("/bookings/status", optionalToken, getClientBookingStatus);
router.get("/bookings/track", optionalToken, getClientBookingStatus);

router.get("/booking/:id/status", optionalToken, getClientBookingStatus);
router.get("/booking/:id/track", optionalToken, getClientBookingStatus);
router.get("/bookings/:id/status", optionalToken, getClientBookingStatus);
router.get("/bookings/:id/track", optionalToken, getClientBookingStatus);

router.get("/booking/:id", optionalToken, getClientBookingById);
router.get("/bookings/:id", optionalToken, getClientBookingById);

// Client View Visit Reports (vitals, tasks, notes, photos)
router.get("/booking/:id/daily-report", optionalToken, getStaffVisitReports);

// Client Help request (Enquiry) flow routes
router.post("/enquiry/create", optionalToken, uploadStaffFiles, createClientEnquiry);
router.get("/enquiries", optionalToken, getClientEnquiries);
router.get("/enquiry/:id", optionalToken, getClientEnquiryById);

// Client Coming Soon "Notify Me" & In-App Notification routes
const {
  subscribeNotifyMe,
  getNotifyMeStatus,
  getClientNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notification.controller");

// Step: Client registers interest / clicks "Notify Me" on a Coming Soon category or service
router.post("/notify-me", optionalToken, subscribeNotifyMe);
router.post("/coming-soon/notify-me", optionalToken, subscribeNotifyMe);
router.get("/notify-me/status", optionalToken, getNotifyMeStatus);

// In-App Notifications list & read state
router.get("/notifications", optionalToken, getClientNotifications);
router.patch("/notifications/mark-all-read", optionalToken, markAllNotificationsAsRead);
router.patch("/notifications/:id/read", optionalToken, markNotificationAsRead);

module.exports = router;
