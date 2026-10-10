const express = require("express");
const router = express.Router();
const { staffRegistration } = require("../controllers/staff.controller");
const { staffSendOtp, staffVerifyOtp } = require("../controllers/auth.controller");

// Step 1: Send OTP to phone for staff registration
router.post("/send-otp", staffSendOtp);

// Step 2: Verify OTP for phone verification
router.post("/verify-otp", staffVerifyOtp);

// Step 3: Register staff (requires verified phone)
router.post("/register", staffRegistration);

// Staff Login via OTP
router.post("/login/send-otp", staffSendOtp);
router.post("/login/verify-otp", staffVerifyOtp);
router.post("/login", staffVerifyOtp);

module.exports = router;
