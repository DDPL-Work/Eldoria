const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { sequelize, User, Client, Otp } = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");
const { generateClientId } = require("../helpers/generateClientID");

/**
 * Standardize phone number format (digits only, e.g. 10 digits)
 */
const normalizePhone = (phone = "") => {
  return String(phone).replace(/[^\d+]/g, "").trim();
};

/**
 * 1. Client Send OTP
 * Step: Enter phone no. -> send-otp
 * POST /api/v1/client/send-otp (or /login/send-otp)
 */
const clientSendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return errorResponse(res, "Phone number is required", 400);
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 10) {
      return errorResponse(res, "Please provide a valid 10-digit phone number", 400);
    }

    // Check if phone belongs to an admin or staff (security check)
    const existingUser = await User.findOne({ where: { phone: cleanPhone } });
    if (existingUser && existingUser.role !== "client") {
      return errorResponse(
        res,
        `This phone number is registered as '${existingUser.role}'. Please use the ${existingUser.role} portal.`,
        403,
      );
    }

    if (existingUser && !existingUser.isActive) {
      return errorResponse(
        res,
        "Your account is inactive. Please contact support or administrator.",
        403,
      );
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Invalidate previous unverified client OTPs for this phone
    await Otp.update(
      { isVerified: true },
      {
        where: {
          phone: cleanPhone,
          purpose: "login",
          isVerified: false,
        },
      },
    );

    // Create new OTP record
    await Otp.create({
      phone: cleanPhone,
      otp: otpCode,
      purpose: "login",
      expiresAt,
      isVerified: false,
    });

    console.log(`📱 [CLIENT OTP] Sent OTP for ${cleanPhone}: ${otpCode}`);

    return successResponse(
      res,
      {
        phone: cleanPhone,
        expiresInSeconds: 600,
        // In non-production, include OTP for easy API testing
        otp: process.env.NODE_ENV === "production" ? undefined : otpCode,
      },
      `OTP sent successfully to ${cleanPhone}`,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to send OTP", 500, error);
  }
};

/**
 * 2. Client Verify OTP (Smart Login & Registration Gateway)
 * Step: Enter OTP -> verify-otp
 *  - If phone already exists: Direct login success!
 *  - If phone does NOT exist: Returns verificationToken and instructs to register (Enter city and area)
 * POST /api/v1/client/verify-otp (or /login/verify-otp)
 */
const clientVerifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return errorResponse(res, "Phone number and OTP are required", 400);
    }

    const cleanPhone = normalizePhone(phone);
    const cleanOtp = String(otp).trim();

    // Find the latest valid OTP for this phone
    const otpRecord = await Otp.findOne({
      where: {
        phone: cleanPhone,
        otp: cleanOtp,
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

    // Check if client already exists in the system
    const existingUser = await User.findOne({
      where: { phone: cleanPhone, role: "client" },
      include: [
        {
          model: Client,
          as: "clientProfile",
          required: false,
        },
      ],
    });

    // CASE A: RETURNING CLIENT -> DIRECT LOGIN
    if (existingUser) {
      await otpRecord.save();

      if (!existingUser.isActive) {
        return errorResponse(
          res,
          "Your account is inactive. Please contact support.",
          403,
        );
      }

      // Generate session JWT token + cryptographic salt & hash
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto
        .createHash("sha256")
        .update(`${existingUser.id}:${existingUser.phone}:${salt}:${Date.now()}`)
        .digest("hex");

      const jwtSecret =
        process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

      const token = jwt.sign(
        {
          id: existingUser.id,
          email: existingUser.email,
          phone: existingUser.phone,
          role: existingUser.role,
          name: existingUser.name,
          salt,
          hash,
        },
        jwtSecret,
        { expiresIn: jwtExpiresIn },
      );

      const sanitizedUser = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        role: existingUser.role,
        isActive: existingUser.isActive,
        createdAt: existingUser.createdAt,
      };

      return successResponse(
        res,
        {
          isNewUser: false,
          isRegistered: true,
          user: sanitizedUser,
          clientProfile: existingUser.clientProfile || null,
          token,
          salt,
          hash,
        },
        "Client logged in successfully",
      );
    }

    // CASE B: NEW CLIENT -> CALL REGISTRATION FLOW
    const verificationToken = crypto.randomBytes(24).toString("hex");
    otpRecord.verificationToken = verificationToken;
    otpRecord.purpose = "registration";
    await otpRecord.save();

    return successResponse(
      res,
      {
        isNewUser: true,
        isRegistered: false,
        phone: cleanPhone,
        verificationToken,
        nextStep: "register",
      },
      "Phone verified successfully. Please complete registration by entering your city and area.",
    );
  } catch (error) {
    return errorResponse(res, error.message || "OTP verification failed", 500, error);
  }
};

/**
 * 3. Client Registration
 * Step: Enter city and area -> register
 * Creates User and Client Profile, then immediately completes login.
 * POST /api/v1/client/register
 */
const clientRegistration = async (req, res) => {
  // 1. Validate request body
  if (!req.body || typeof req.body !== "object") {
    return errorResponse(res, "Request body is missing or empty", 400);
  }

  const {
    phone,
    verificationToken,
    city,
    area,
    name,
    email,
    address,
    pincode,
    landmark,
    patientName,
    patientAge,
    patientGender,
    relation,
    patientType,
    medicalConditions,
    mobilityStatus,
    requiredService,
    preferredPlan,
    preferredTiming,
    expectedDuration,
    specialInstructions,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
    files,
    source = "App",
    preferredLanguage = "English",
    notes,
  } = req.body;

  // 2. Validate required registration fields (Phone, City, Area)
  if (!phone) {
    return errorResponse(res, "Phone number is required", 400);
  }

  if (!city || !area) {
    return errorResponse(res, "City and area are required to complete registration", 400);
  }

  const cleanPhone = normalizePhone(phone);
  if (cleanPhone.length < 10) {
    return errorResponse(res, "Please provide a valid 10-digit phone number", 400);
  }

  // 3. Verify OTP verification token
  try {
    const verifiedOtp = await Otp.findOne({
      where: {
        phone: cleanPhone,
        isVerified: true,
        ...(verificationToken ? { verificationToken } : {}),
      },
      order: [["id", "DESC"]],
    });

    if (!verifiedOtp) {
      return errorResponse(
        res,
        "Phone number has not been verified with OTP. Please request and verify OTP first.",
        400,
      );
    }
  } catch (otpErr) {
    return errorResponse(res, "Failed to verify phone OTP status", 500, otpErr);
  }

  // 4. Pre-check for duplicate user by phone or email
  try {
    const existingUser = await User.findOne({ where: { phone: cleanPhone } });
    if (existingUser) {
      return errorResponse(
        res,
        "A client account with this phone number already exists. Please login instead.",
        409,
      );
    }

    if (email && email.trim()) {
      const existingEmail = await User.findOne({
        where: { email: email.trim().toLowerCase() },
      });
      if (existingEmail) {
        return errorResponse(res, "A user with this email already exists", 409);
      }
    }
  } catch (err) {
    return errorResponse(res, err.message || "Database validation failed", 500, err);
  }

  // 5. Begin transaction for atomic User + Client creation
  let transaction;
  try {
    transaction = await sequelize.transaction();

    // Generate formatted Client ID e.g. ELDOCL26M0001
    const clientId = await generateClientId(city, transaction);

    // Create User record (role: 'client')
    const displayName = (name && name.trim()) || `Client ${cleanPhone.slice(-4)}`;
    const userEmail = (email && email.trim().toLowerCase()) || null;

    const newUser = await User.create(
      {
        name: displayName,
        email: userEmail,
        phone: cleanPhone,
        role: "client",
        isActive: true,
      },
      { transaction },
    );

    // Create Client profile record with domain fields
    const newClient = await Client.create(
      {
        userId: newUser.id,
        clientId,
        city: city.trim().toLowerCase(),
        area: area.trim(),
        address: address ? address.trim() : null,
        pincode: pincode ? pincode.trim() : null,
        landmark: landmark ? landmark.trim() : null,
        patientName: patientName ? patientName.trim() : null,
        patientAge: patientAge ? parseInt(patientAge, 10) : null,
        patientGender: patientGender || null,
        relation: relation || "Mother",
        patientType: patientType || null,
        medicalConditions: medicalConditions ? medicalConditions.trim() : null,
        mobilityStatus: mobilityStatus || null,
        requiredService: requiredService || null,
        preferredPlan: preferredPlan || null,
        preferredTiming: preferredTiming || null,
        expectedDuration: expectedDuration || null,
        specialInstructions: specialInstructions ? specialInstructions.trim() : null,
        emergencyName: emergencyName ? emergencyName.trim() : null,
        emergencyPhone: emergencyPhone ? normalizePhone(emergencyPhone) : null,
        emergencyRelation: emergencyRelation ? emergencyRelation.trim() : null,
        files: files || {},
        source: source || "App",
        preferredLanguage: preferredLanguage || "English",
        notes: notes ? notes.trim() : null,
        status: "active",
      },
      { transaction },
    );

    // Invalidate/consume the OTP record
    await Otp.update(
      { verificationToken: null },
      { where: { phone: cleanPhone }, transaction },
    );

    await transaction.commit();

    // 6. Generate immediate login session
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${newUser.id}:${newUser.phone}:${salt}:${Date.now()}`)
      .digest("hex");

    const jwtSecret =
      process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        name: newUser.name,
        salt,
        hash,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn },
    );

    const sanitizedUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    };

    return successResponse(
      res,
      {
        user: sanitizedUser,
        clientProfile: newClient,
        token,
        salt,
        hash,
      },
      "Client registered and logged in successfully",
      201,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to register client", 500, error);
  }
};

/**
 * 4. Get Current Client Profile
 * GET /api/v1/client/profile
 */
const getClientProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "phone", "role", "isActive", "createdAt"],
      include: [
        {
          model: Client,
          as: "clientProfile",
        },
      ],
    });

    if (!user) {
      return errorResponse(res, "Client not found", 404);
    }

    return successResponse(res, user, "Client profile fetched successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to fetch profile", 500, error);
  }
};

/**
 * 5. Update Current Client Profile
 * PATCH /api/v1/client/profile
 */
const updateClientProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, ...clientFields } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, "Client not found", 404);
    }

    // Update User identity fields if provided
    if (name && name.trim()) user.name = name.trim();
    if (email && email.trim()) user.email = email.trim().toLowerCase();
    await user.save();

    // Update Client profile fields
    let clientProfile = await Client.findOne({ where: { userId } });
    if (!clientProfile) {
      clientProfile = await Client.create({ userId, ...clientFields });
    } else {
      await clientProfile.update(clientFields);
    }

    const updated = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "phone", "role", "isActive", "createdAt"],
      include: [{ model: Client, as: "clientProfile" }],
    });

    return successResponse(res, updated, "Client profile updated successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to update profile", 500, error);
  }
};

module.exports = {
  clientSendOtp,
  clientVerifyOtp,
  clientRegistration,
  getClientProfile,
  updateClientProfile,
};
