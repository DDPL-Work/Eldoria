const express = require("express");
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  staffSendOtp,
  staffVerifyOtp,
  clientSendOtp,
  clientVerifyOtp,
  getProfile,
  updateProfile,
  sendChangePhoneOtp,
  updateMobileNumber,
} = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

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

// Profile management routes (unified for both Staff and Client)
router.get("/profile", verifyToken, getProfile);
router.get("/profile/:id", verifyToken, getProfile);

router.patch("/profile/:id", verifyToken, updateProfile);


// Mobile number change routes (unified for both Staff and Client)
router.post("/change-phone/send-otp", verifyToken, sendChangePhoneOtp);
router.patch("/change-phone", verifyToken, updateMobileNumber);

module.exports = router;
