const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User, Staff, Otp, Client } = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");

/**
 * Standardize phone number format (digits only, e.g. 10 digits)
 */
const normalizePhone = (phone = "") => {
  return String(phone).replace(/[^\d+]/g, "").trim();
};

/**
 * 1. Send OTP (Phone Verification for Registration or Login)
 * POST /api/v1/auth/send-otp
 */
const sendOtp = async (req, res) => {
  try {
    const { phone, purpose = "login", role = "staff" } = req.body;

    if (!phone) {
      return errorResponse(res, "Phone number is required", 400);
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 10) {
      return errorResponse(res, "Please provide a valid phone number (at least 10 digits)", 400);
    }

    const validPurposes = ["registration", "login"];
    const otpPurpose = validPurposes.includes(purpose) ? purpose : "login";

    // Purpose-specific pre-checks
    if (otpPurpose === "registration") {
      const existingUser = await User.findOne({ where: { phone: cleanPhone } });
      if (existingUser) {
        return errorResponse(
          res,
          "A user with this phone number is already registered. Please log in instead.",
          409,
        );
      }
    } else if (otpPurpose === "login") {
      const user = await User.findOne({ where: { phone: cleanPhone } });
      if (!user) {
        return errorResponse(
          res,
          "No account registered with this phone number. Please register first.",
          404,
        );
      }

      if (user.role === "admin") {
        return errorResponse(
          res,
          "Admin accounts must log in via the admin portal",
          403,
        );
      }

      if (role && user.role !== role) {
        return errorResponse(
          res,
          `This phone number is registered as '${user.role}', not '${role}'.`,
          403,
        );
      }

      if (!user.isActive) {
        return errorResponse(
          res,
          "Your account is inactive. Please contact support or administrator.",
          403,
        );
      }
    }

    // Generate 6-digit OTP (e.g. 100000 - 999999)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Invalidate previous unverified OTPs for this phone & purpose
    await Otp.update(
      { isVerified: true },
      {
        where: {
          phone: cleanPhone,
          purpose: otpPurpose,
          isVerified: false,
        },
      },
    );

    // Save new OTP record
    await Otp.create({
      phone: cleanPhone,
      otp: otpCode,
      purpose: otpPurpose,
      expiresAt,
      isVerified: false,
    });

    console.log(`📱 [OTP SERVICE] Sent OTP for ${cleanPhone} (${otpPurpose}): ${otpCode}`);

    return successResponse(
      res,
      {
        phone: cleanPhone,
        purpose: otpPurpose,
        expiresInSeconds: 600,
        // In non-production environments, provide OTP in response for easy testing
        otp: process.env.NODE_ENV === "production" ? undefined : otpCode,
      },
      `OTP sent successfully to ${cleanPhone}`,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to send OTP", 500, error);
  }
};

/**
 * 2. Verify OTP
 * Handles both:
 *  - Registration: Verifies phone and returns verificationToken for the registration form
 *  - Login: Verifies phone and immediately logs in the user (returns JWT token)
 * POST /api/v1/auth/verify-otp
 */
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, purpose = "login", role } = req.body;

    if (!phone || !otp) {
      return errorResponse(res, "Phone number and OTP are required", 400);
    }

    const cleanPhone = normalizePhone(phone);
    const cleanOtp = String(otp).trim();

    // Find the latest valid matching OTP record
    const otpRecord = await Otp.findOne({
      where: {
        phone: cleanPhone,
        otp: cleanOtp,
        purpose,
        isVerified: false,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      order: [["id", "DESC"]],
    });

    if (!otpRecord) {
      return errorResponse(
        res,
        "Invalid or expired OTP. Please enter the correct OTP or request a new one.",
        400,
      );
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;

    // A. Registration Verification Flow:
    if (purpose === "registration") {
      const verificationToken = crypto.randomBytes(24).toString("hex");
      otpRecord.verificationToken = verificationToken;
      await otpRecord.save();

      return successResponse(
        res,
        {
          phone: cleanPhone,
          isVerified: true,
          verificationToken,
        },
        "Phone number verified successfully. You may now proceed with registration.",
      );
    }

    // B. Login Verification Flow:
    await otpRecord.save();

    const userWhere = { phone: cleanPhone };
    if (role) {
      userWhere.role = role;
    }

    const user = await User.findOne({
      where: userWhere,
      include: [
        {
          model: Staff,
          as: "staffProfile",
          required: false,
        },
        {
          model: Client,
          as: "clientProfile",
          required: false,
        },
      ],
    });

    if (!user) {
      return errorResponse(res, "Account not found for this phone number", 404);
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        "Your account is inactive. Please contact administrator.",
        403,
      );
    }

    // Staff-specific profile and approval validation
    let staffProfile = null;
    if (user.role === "staff") {
      staffProfile = user.staffProfile;

      if (!staffProfile && user.staffId) {
        staffProfile = await Staff.findOne({
          where: { staffId: user.staffId },
        });
      }

      if (staffProfile && staffProfile.approval === "rejected") {
        return errorResponse(
          res,
          "Your staff registration has been rejected. Please contact support.",
          403,
          { approval: "rejected", notes: staffProfile.notes },
        );
      }
    }

    // Generate cryptographic salt, hash, and JWT token
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${user.id}:${user.email || user.phone}:${salt}:${Date.now()}`)
      .digest("hex");

    const jwtSecret =
      process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        staffId: user.staffId || null,
        name: user.name,
        salt,
        hash,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn },
    );

    const sanitizedUser = {
      id: user.id,
      staffId: user.staffId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const responseData = {
      user: sanitizedUser,
      token,
      salt,
      hash,
    };

    if (user.role === "staff" && staffProfile) {
      responseData.staffProfile = staffProfile;
    }

    if (user.role === "client" && user.clientProfile) {
      responseData.clientProfile = user.clientProfile;
    }

    const roleName = user.role === "staff" ? "Staff" : "Client";
    return successResponse(
      res,
      responseData,
      `${roleName} logged in successfully via OTP verification`,
    );
  } catch (error) {
    return errorResponse(res, error.message || "OTP verification failed", 500, error);
  }
};

/**
 * Dedicated Staff Send OTP (defaults role: 'staff')
 */
const staffSendOtp = async (req, res) => {
  req.body.role = "staff";
  return sendOtp(req, res);
};

/**
 * Dedicated Staff Verify OTP (defaults role: 'staff')
 */
const staffVerifyOtp = async (req, res) => {
  req.body.role = "staff";
  return verifyOtp(req, res);
};

/**
 * Dedicated Client Send OTP (defaults role: 'client')
 */
const clientSendOtp = async (req, res) => {
  req.body.role = "client";
  return sendOtp(req, res);
};

/**
 * Dedicated Client Verify OTP (defaults role: 'client')
 */
const clientVerifyOtp = async (req, res) => {
  req.body.role = "client";
  return verifyOtp(req, res);
};

module.exports = {
  sendOtp,
  verifyOtp,
  staffSendOtp,
  staffVerifyOtp,
  clientSendOtp,
  clientVerifyOtp,
};
