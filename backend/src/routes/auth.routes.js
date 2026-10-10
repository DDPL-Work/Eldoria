const express = require("express");
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  staffSendOtp,
  staffVerifyOtp,
  clientSendOtp,
  clientVerifyOtp,
} = require("../controllers/auth.controller");

// Universal OTP routes (handles registration & login)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Role-specific OTP routes for staff
router.post("/staff/send-otp", staffSendOtp);
router.post("/staff/verify-otp", staffVerifyOtp);
router.post("/staff/login", staffVerifyOtp);

// Role-specific OTP routes for client
router.post("/client/send-otp", clientSendOtp);
router.post("/client/verify-otp", clientVerifyOtp);
router.post("/client/login", clientVerifyOtp);

module.exports = router;
