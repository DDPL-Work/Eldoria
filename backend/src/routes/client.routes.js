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

module.exports = router;
