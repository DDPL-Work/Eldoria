const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { Admin, Otp } = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");

/**
 * Standardize phone number format (digits only, e.g. 10 digits)
 */
const normalizePhone = (phone = "") => {
  return String(phone).replace(/[^\d+]/g, "").trim();
};

/**
 * 1. Admin Login Controller
 * Authenticates users with strict admin role verification
 * POST /api/v1/admin/login
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate required fields
    if (!email || !password) {
      return errorResponse(res, "Email and password are required", 400);
    }

    // 2. Lookup user by email
    const adminUser = await Admin.findOne({ where: { email } });
    if (!adminUser) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    // 3. Strict Admin-only role check
    if (adminUser.role !== "admin") {
      return errorResponse(
        res,
        "Unauthorized access: Admin privileges required",
        403,
      );
    }

    // 4. Verify account status
    if (!adminUser.isActive) {
      return errorResponse(
        res,
        "Account is inactive. Please contact the administrator",
        403,
      );
    }

    // 5. Verify password (supports bcrypt hash or plain text fallback for initial seeds)
    const isPasswordValid = adminUser.password.startsWith("$2")
      ? await bcrypt.compare(password, adminUser.password)
      : adminUser.password === password;

    if (!isPasswordValid) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    // 6. Generate cryptographic salt, hash, and JWT token
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${adminUser.id}:${adminUser.email}:${salt}:${Date.now()}`)
      .digest("hex");

    const jwtSecret =
      process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        phone: adminUser.phone,
        role: adminUser.role,
        name: adminUser.name,
        salt,
        hash,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn },
    );

    // 7. Sanitize response (omit sensitive fields like password)
    const sanitizedAdmin = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      phone: adminUser.phone,
      isActive: adminUser.isActive,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
    };

    return successResponse(
      res,
      {
        user: sanitizedAdmin,
        token,
      },
      "Admin logged in successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500, error);
  }
};

/**
 * 2. Admin Forgot Password (Generates Email OTP)
 * Simulates email service for now by generating the OTP and logging it
 * POST /api/v1/admin/forgot-password
 */
const adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Admin email address is required", 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return errorResponse(res, "Please provide a valid email address", 400);
    }

    // Lookup admin account
    const adminUser = await Admin.findOne({ where: { email: cleanEmail } });
    if (!adminUser) {
      return errorResponse(
        res,
        "No admin account found with this email address",
        404,
      );
    }

    if (!adminUser.isActive) {
      return errorResponse(
        res,
        "This admin account is inactive. Please contact system support.",
        403,
      );
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Invalidate previous unverified forgot_password OTPs for this email
    await Otp.update(
      { isVerified: true },
      {
        where: {
          email: cleanEmail,
          purpose: "forgot_password",
          isVerified: false,
        },
      },
    );

    // Save new OTP record
    await Otp.create({
      email: cleanEmail,
      otp: otpCode,
      purpose: "forgot_password",
      expiresAt,
      isVerified: false,
    });

    console.log(
      `📧 [EMAIL OTP GENERATOR] Admin Password Reset OTP for ${cleanEmail}: ${otpCode}`,
    );

    return successResponse(
      res,
      {
        email: cleanEmail,
        purpose: "forgot_password",
        expiresInSeconds: 600,
        // Provided for testing while real external SMTP/email service is pending
        otp: otpCode,
      },
      `Password reset OTP generated successfully for ${cleanEmail}`,
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to process forgot password request",
      500,
      error,
    );
  }
};

/**
 * 3. Admin Reset Password (Verify OTP & Set New Password)
 * POST /api/v1/admin/reset-password
 */
const adminResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return errorResponse(
        res,
        "Email, OTP, and newPassword are required",
        400,
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (newPassword.length < 6) {
      return errorResponse(
        res,
        "New password must be at least 6 characters long",
        400,
      );
    }

    if (confirmPassword && confirmPassword !== newPassword) {
      return errorResponse(
        res,
        "Confirm password does not match new password",
        400,
      );
    }

    // Verify OTP record
    const otpRecord = await Otp.findOne({
      where: {
        email: cleanEmail,
        otp: cleanOtp,
        purpose: "forgot_password",
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

    // Lookup admin account
    const adminUser = await Admin.findOne({ where: { email: cleanEmail } });
    if (!adminUser) {
      return errorResponse(res, "Admin account not found", 404);
    }

    // Hash the new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    adminUser.password = hashedPassword;
    await adminUser.save();

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    return successResponse(
      res,
      {
        email: cleanEmail,
      },
      "Password reset successfully. You can now log in with your new password.",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to reset password",
      500,
      error,
    );
  }
};

/**
 * 4. Admin Change Mobile Number
 * Changes phone number directly without verifying OTP, authenticated via Admin JWT token
 * PATCH /api/v1/admin/change-phone
 */
const adminChangePhone = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return errorResponse(
        res,
        "Unauthorized: Admin ID not found in token",
        401,
      );
    }

    const { phone, newPhone } = req.body;
    const targetPhone = newPhone || phone;

    if (!targetPhone) {
      return errorResponse(res, "New phone number is required", 400);
    }

    const cleanPhone = normalizePhone(targetPhone);
    if (cleanPhone.length < 10) {
      return errorResponse(
        res,
        "Please provide a valid phone number (at least 10 digits)",
        400,
      );
    }

    const adminUser = await Admin.findByPk(adminId);
    if (!adminUser) {
      return errorResponse(res, "Admin account not found", 404);
    }

    if (!adminUser.isActive) {
      return errorResponse(
        res,
        "Admin account is inactive. Please contact support.",
        403,
      );
    }

    if (adminUser.phone && normalizePhone(adminUser.phone) === cleanPhone) {
      return errorResponse(
        res,
        "The new phone number is identical to your current phone number",
        400,
      );
    }

    // Check if another admin already uses this phone number
    const existingAdmin = await Admin.findOne({
      where: {
        phone: cleanPhone,
        id: { [Op.ne]: adminId },
      },
    });

    if (existingAdmin) {
      return errorResponse(
        res,
        "This phone number is already registered with another admin account.",
        409,
      );
    }

    const oldPhone = adminUser.phone;
    adminUser.phone = cleanPhone;
    await adminUser.save();

    // Re-issue fresh JWT token containing updated phone
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${adminUser.id}:${adminUser.email}:${salt}:${Date.now()}`)
      .digest("hex");

    const jwtSecret =
      process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        phone: adminUser.phone,
        role: adminUser.role,
        name: adminUser.name,
        salt,
        hash,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn },
    );

    const sanitizedAdmin = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      phone: adminUser.phone,
      isActive: adminUser.isActive,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
    };

    return successResponse(
      res,
      {
        user: sanitizedAdmin,
        oldPhone,
        newPhone: adminUser.phone,
        token,
      },
      "Admin mobile number updated successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to update admin mobile number",
      500,
      error,
    );
  }
};

/**
 * 5. Fetch Admin Profile
 * GET /api/v1/admin/profile
 */
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return errorResponse(res, "Unauthorized: Admin ID not found in token", 401);
    }

    const adminUser = await Admin.findByPk(adminId, {
      attributes: ["id", "name", "email", "phone", "role", "isActive", "createdAt", "updatedAt"],
    });

    if (!adminUser) {
      return errorResponse(res, "Admin account not found", 404);
    }

    return successResponse(res, adminUser, "Admin profile fetched successfully");
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch admin profile",
      500,
      error,
    );
  }
};

/**
 * 6. Edit / Update Admin Profile
 * PATCH /api/v1/admin/profile
 */
const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return errorResponse(res, "Unauthorized: Admin ID not found in token", 401);
    }

    if (!req.body || typeof req.body !== "object" || Object.keys(req.body).length === 0) {
      return errorResponse(res, "Request payload cannot be empty", 400);
    }

    const adminUser = await Admin.findByPk(adminId);
    if (!adminUser) {
      return errorResponse(res, "Admin account not found", 404);
    }

    if (!adminUser.isActive) {
      return errorResponse(
        res,
        "Admin account is inactive. Please contact support.",
        403,
      );
    }

    const { name, email } = req.body;

    // Update name
    if (name !== undefined && name !== null) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return errorResponse(res, "Name cannot be empty", 400);
      }
      adminUser.name = cleanName;
    }

    // Update email
    if (email !== undefined && email !== null) {
      const cleanEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return errorResponse(res, "Please provide a valid email address", 400);
      }

      if (cleanEmail !== adminUser.email) {
        const emailExists = await Admin.findOne({
          where: {
            email: cleanEmail,
            id: { [Op.ne]: adminId },
          },
        });

        if (emailExists) {
          return errorResponse(
            res,
            "An admin account with this email already exists",
            409,
          );
        }
        adminUser.email = cleanEmail;
      }
    }

    await adminUser.save();

    // Re-issue JWT token with updated info
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${adminUser.id}:${adminUser.email}:${salt}:${Date.now()}`)
      .digest("hex");

    const jwtSecret =
      process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        phone: adminUser.phone,
        role: adminUser.role,
        name: adminUser.name,
        salt,
        hash,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn },
    );

    const sanitizedAdmin = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      role: adminUser.role,
      isActive: adminUser.isActive,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
    };

    return successResponse(
      res,
      {
        user: sanitizedAdmin,
        token,
      },
      "Admin profile updated successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to update admin profile",
      500,
      error,
    );
  }
};

/**
 * 7. Change Password from Admin Profile
 * PATCH /api/v1/admin/change-password
 */
const adminChangePassword = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return errorResponse(res, "Unauthorized: Admin ID not found in token", 401);
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(
        res,
        "Current password and new password are required",
        400,
      );
    }

    if (newPassword.length < 6) {
      return errorResponse(
        res,
        "New password must be at least 6 characters long",
        400,
      );
    }

    if (confirmPassword && confirmPassword !== newPassword) {
      return errorResponse(
        res,
        "Confirm password does not match new password",
        400,
      );
    }

    const adminUser = await Admin.findByPk(adminId);
    if (!adminUser) {
      return errorResponse(res, "Admin account not found", 404);
    }

    if (!adminUser.isActive) {
      return errorResponse(
        res,
        "Admin account is inactive. Please contact support.",
        403,
      );
    }

    // Verify current password
    const isCurrentValid = adminUser.password.startsWith("$2")
      ? await bcrypt.compare(currentPassword, adminUser.password)
      : adminUser.password === currentPassword;

    if (!isCurrentValid) {
      return errorResponse(res, "Current password is incorrect", 400);
    }

    // Verify new password is not identical to current password
    const isSamePassword = adminUser.password.startsWith("$2")
      ? await bcrypt.compare(newPassword, adminUser.password)
      : adminUser.password === newPassword;

    if (isSamePassword) {
      return errorResponse(
        res,
        "New password cannot be the same as your current password",
        400,
      );
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    adminUser.password = hashedPassword;
    await adminUser.save();

    return successResponse(
      res,
      {
        id: adminUser.id,
        email: adminUser.email,
      },
      "Password changed successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to change password",
      500,
      error,
    );
  }
};

module.exports = {
  adminLogin,
  adminForgotPassword,
  adminResetPassword,
  adminChangePhone,
  getAdminProfile,
  updateAdminProfile,
  adminChangePassword,
};
