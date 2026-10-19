const express = require("express");
const router = express.Router();
const {
  staffRegistration,
  updateStaffApplication,
  trackApplication,
  viewStaffDocument,
} = require("../controllers/staff.controller");
const {
  staffSendOtp,
  staffVerifyOtp,
} = require("../controllers/auth.controller");
const { uploadStaffFiles } = require("../middlewares/upload.middleware");

const { optionalToken } = require("../middlewares/auth.middleware");
const {
  getStaffBookings,
  getStaffBookingById,
  updateStaffAssignedBookingStatus,
  submitStaffVisitReport,
  getStaffVisitReports,
  staffAssignColleagueToBooking,
  staffConfirmBooking,
} = require("../controllers/booking.controller");

// Document viewing & streaming (bypasses Cloudinary PDF/ACL restrictions)
router.get("/document/view", viewStaffDocument);


// Step 1: Send OTP to phone for staff registration
router.post("/send-otp", staffSendOtp);

// Step 2: Verify OTP for phone verification
router.post("/verify-otp", staffVerifyOtp);

// Step 3: Register staff (requires verified phone, uploads PDF & image documents to Cloudinary)
router.post("/register", uploadStaffFiles, staffRegistration);

// Step 4: Track application after submitting/updating request (supports staffId in URL param)
router.get("/application/:staffId/status", trackApplication);
// Step 5: Re-upload documents / update application after change request
router.patch("/application/:staffId/update", uploadStaffFiles, updateStaffApplication);

// Staff Login via OTP
router.post("/login/send-otp", staffSendOtp);
router.post("/login/verify-otp", staffVerifyOtp);
router.post("/login", staffVerifyOtp);

// Staff Visits / Bookings routes
router.get("/bookings", optionalToken, getStaffBookings);
router.get("/booking/:id", optionalToken, getStaffBookingById);

// Staff updates status of visits assigned to them (supports status updates + visit reports & photos)
router.patch("/booking/:id/status", optionalToken, uploadStaffFiles, updateStaffAssignedBookingStatus);

// Staff Daily Visit Report: vitals (BP, pulse, SpO2, temp, sugar), tasks done, notes, photos, documents
router.post("/booking/:id/daily-report", optionalToken, uploadStaffFiles, submitStaffVisitReport);

// Staff view visit reports
router.get("/booking/:id/daily-report", optionalToken, getStaffVisitReports);

// Staff confirms or rejects a visit assigned to them (and assigns self or colleague if permitted)
router.patch("/booking/:id/confirm", optionalToken, staffConfirmBooking);

// Staff assigns or reassigns their assigned visit to a colleague
// (Requires staff.canTransferBooking: true)
router.patch("/booking/:id/reassign", optionalToken, staffAssignColleagueToBooking);

module.exports = router;
