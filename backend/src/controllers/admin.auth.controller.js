const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Admin } = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");

/**
 * Admin Login Controller
 * Authenticates users with strict admin role verification
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
        salt,
        hash,
      },
      "Admin logged in successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message, 500, error);
  }
};

module.exports = {
  adminLogin,
};
