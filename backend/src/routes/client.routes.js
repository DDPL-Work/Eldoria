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

// Client Booking flow routes
router.post("/booking/create", optionalToken, createClientBooking);
router.post("/bookings/create", optionalToken, createClientBooking);
router.post("/bookings", optionalToken, createClientBooking);
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

// Client Help request (Enquiry) flow routes

router.post("/enquiry/create", optionalToken, uploadStaffFiles, createClientEnquiry);
router.get("/enquiries", optionalToken, getClientEnquiries);
router.get("/enquiry/:id", optionalToken, getClientEnquiryById);

module.exports = router;
