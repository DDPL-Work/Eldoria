const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { sequelize, User, Staff, Otp, Client } = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");
const { logOtpToTerminal } = require("../helpers/otpLogger");

/**
 * Standardize phone number format (digits only, e.g. 10 digits)
 */
const normalizePhone = (phone = "") => {
  return String(phone)
    .replace(/[^\d+]/g, "")
    .trim();
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
      return errorResponse(
        res,
        "Please provide a valid phone number (at least 10 digits)",
        400,
      );
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

    // console.log(
    //   `📱 [OTP SERVICE] Sent OTP for ${cleanPhone} (${otpPurpose}): ${otpCode}`,
    // );

     logOtpToTerminal({
      channel: "SMS",
      recipient: cleanPhone,
      otp: otpCode,
      purpose: otpPurpose,
      role: role || "user",
      expiresInMinutes: 10,
    });

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
    return errorResponse(
      res,
      error.message || "Failed to send OTP",
      500,
      error,
    );
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
    return errorResponse(
      res,
      error.message || "OTP verification failed",
      500,
      error,
    );
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

/**
 * Helper to resolve User by identifier (staffId, clientId, or userId)
 */
const resolveUserByIdentifier = async (identifier, transaction = null) => {
  if (!identifier) return null;
  const cleanId = String(identifier).trim();

  // 1. Check if identifier matches staffId in users table
  let user = await User.findOne({
    where: { staffId: cleanId },
    transaction,
  });
  if (user) return user;

  // 2. Check if identifier matches staffId in staff table
  const staffByCode = await Staff.findOne({
    where: { staffId: cleanId },
    transaction,
  });
  if (staffByCode && staffByCode.staffId) {
    user = await User.findOne({
      where: { staffId: staffByCode.staffId },
      transaction,
    });
    if (user) return user;
  }

  // 3. Check if identifier matches clientId in clients table
  const client = await Client.findOne({
    where: { clientId: cleanId },
    transaction,
  });
  if (client && client.userId) {
    user = await User.findByPk(client.userId, { transaction });
    if (user) return user;
  }

  // 4. Check if identifier matches numeric id in users table or staff table
  if (/^\d+$/.test(cleanId)) {
    user = await User.findByPk(Number(cleanId), { transaction });
    if (user) return user;

    const staffById = await Staff.findByPk(Number(cleanId), { transaction });
    if (staffById && staffById.staffId) {
      user = await User.findOne({
        where: { staffId: staffById.staffId },
        transaction,
      });
      if (user) return user;
    }
  }

  return null;
};

/**
 * 3. Fetch / Get User Profile Data (Staff & Client both)
 * GET /api/v1/auth/profile
 * GET /api/v1/auth/profile/:id
 * URL parameter :id can be staffId, clientId, or userId
 */
const getProfile = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser || !authUser.id) {
      return errorResponse(
        res,
        "Unauthorized: User ID not found in token",
        401,
      );
    }

    const identifier =
      req.params?.id ||
      req.query?.id ||
      req.query?.staffId ||
      req.query?.clientId ||
      authUser.id;
    let user = await resolveUserByIdentifier(identifier);

    if (!user && (identifier === authUser.id || !req.params?.id)) {
      user = await User.findByPk(authUser.id);
    }

    if (!user) {
      return errorResponse(
        res,
        `User profile not found for identifier '${identifier}'. Please provide a valid staffId or clientId.`,
        404,
      );
    }

    // Authorization check: non-admin users can only view their own profile
    if (authUser.role !== "admin") {
      const isOwner =
        user.id === authUser.id ||
        (user.staffId && user.staffId === authUser.staffId);

      if (!isOwner) {
        return errorResponse(
          res,
          "Access denied: You are only authorized to view your own profile.",
          403,
        );
      }
    }

    const fullUser = await User.findByPk(user.id, {
      attributes: [
        "id",
        "staffId",
        "name",
        "email",
        "phone",
        "role",
        "isActive",
        "createdAt",
        "updatedAt",
      ],
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

    let staffProfile = fullUser.staffProfile || null;
    if (fullUser.role === "staff" && !staffProfile && fullUser.staffId) {
      staffProfile = await Staff.findOne({
        where: { staffId: fullUser.staffId },
      });
    }

    let clientProfile = fullUser.clientProfile || null;
    if (fullUser.role === "client" && !clientProfile) {
      clientProfile = await Client.findOne({
        where: { userId: fullUser.id },
      });
    }

    const sanitizedUser = {
      id: fullUser.id,
      staffId: fullUser.staffId,
      name: fullUser.name,
      email: fullUser.email,
      phone: fullUser.phone,
      role: fullUser.role,
      isActive: fullUser.isActive,
      createdAt: fullUser.createdAt,
      updatedAt: fullUser.updatedAt,
    };

    const currentProfile =
      fullUser.role === "staff" ? staffProfile : clientProfile;

    const responseData = {
      user: sanitizedUser,
      role: fullUser.role,
      profile: currentProfile,
      staffProfile: fullUser.role === "staff" ? staffProfile : null,
      clientProfile: fullUser.role === "client" ? clientProfile : null,
    };

    return successResponse(
      res,
      responseData,
      "Profile data fetched successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch profile data",
      500,
      error,
    );
  }
};

/**
 * 4. Update & Edit Profile (Staff & Client both)
 * PATCH /api/v1/auth/profile/:id
 * URL parameter :id can be staffId, clientId, or userId
 */
const updateProfile = async (req, res) => {
  let transaction;
  try {
    const authUser = req.user;
    if (!authUser || !authUser.id) {
      return errorResponse(
        res,
        "Unauthorized: User ID not found in token",
        401,
      );
    }

    if (
      !req.body ||
      typeof req.body !== "object" ||
      Object.keys(req.body).length === 0
    ) {
      return errorResponse(
        res,
        "Request body cannot be empty. Please provide fields to update.",
        400,
      );
    }

    // Resolve target user by identifier in URL param (:id) or fallback to auth user
    const identifier =
      req.params?.id || req.body?.staffId || req.body?.clientId || authUser.id;
    let user = await resolveUserByIdentifier(identifier);

    if (!user && (identifier === authUser.id || !req.params?.id)) {
      user = await User.findByPk(authUser.id);
    }

    if (!user) {
      return errorResponse(
        res,
        `User profile not found for identifier '${identifier}'. Please provide a valid staffId or clientId.`,
        404,
      );
    }

    // Authorization check: non-admin users can only edit their own profile
    if (authUser.role !== "admin") {
      const isOwner =
        user.id === authUser.id ||
        (user.staffId && user.staffId === authUser.staffId);

      if (!isOwner) {
        return errorResponse(
          res,
          "Access denied: You are only authorized to edit your own profile.",
          403,
        );
      }
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        "Your account is inactive. Please contact support or administrator.",
        403,
      );
    }

    const {
      name,
      email,
      // Staff profile specific fields
      dob,
      gender,
      qualification,
      regNo,
      experience,
      skills,
      language,
      availability,
      onDuty,
      // Client profile specific fields
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
      preferredLanguage,
      source,
      status,
      // Common profile fields
      city,
      area,
      address,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      files,
      notes,
    } = req.body;

    transaction = await sequelize.transaction();

    // 1. Update Core User Details (name, email)
    if (name !== undefined && name !== null) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        if (transaction && !transaction.finished) await transaction.rollback();
        return errorResponse(res, "Name cannot be empty", 400);
      }
      user.name = cleanName;
    }

    if (email !== undefined && email !== null) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          if (transaction && !transaction.finished)
            await transaction.rollback();
          return errorResponse(
            res,
            "Please provide a valid email address",
            400,
          );
        }

        if (cleanEmail !== user.email) {
          const emailExists = await User.findOne({
            where: {
              email: cleanEmail,
              id: { [Op.ne]: user.id },
            },
            transaction,
          });

          if (emailExists) {
            if (transaction && !transaction.finished)
              await transaction.rollback();
            return errorResponse(
              res,
              "An account with this email address already exists. Please choose another email.",
              409,
            );
          }
          user.email = cleanEmail;
        }
      }
    }

    await user.save({ transaction });

    // 2. Role-specific profile updates
    if (user.role === "staff") {
      let staff = null;
      if (user.staffId) {
        staff = await Staff.findOne({
          where: { staffId: user.staffId },
          transaction,
        });
      }
      if (!staff && identifier) {
        staff = await Staff.findOne({
          where: {
            [Op.or]: [
              { staffId: String(identifier) },
              ...(isNaN(identifier) ? [] : [{ id: Number(identifier) }]),
            ],
          },
          transaction,
        });
      }

      const staffUpdateData = {};
      if (dob !== undefined) staffUpdateData.dob = dob;
      if (gender !== undefined) staffUpdateData.gender = gender;
      if (city !== undefined) staffUpdateData.city = city;
      if (area !== undefined) staffUpdateData.area = area;
      if (address !== undefined) staffUpdateData.address = address;
      if (qualification !== undefined)
        staffUpdateData.qualification = qualification;
      if (experience !== undefined) staffUpdateData.experience = experience;
      if (skills !== undefined)
        staffUpdateData.skills = Array.isArray(skills) ? skills : [];
      if (language !== undefined)
        staffUpdateData.language = Array.isArray(language) ? language : [];
      if (availability !== undefined)
        staffUpdateData.availability = Array.isArray(availability)
          ? availability
          : [];
      if (emergencyName !== undefined)
        staffUpdateData.emergencyName = emergencyName;
      if (emergencyPhone !== undefined)
        staffUpdateData.emergencyPhone = emergencyPhone;
      if (emergencyRelation !== undefined)
        staffUpdateData.emergencyRelation = emergencyRelation;
      if (files !== undefined) staffUpdateData.files = files;
      if (onDuty !== undefined) {
        staffUpdateData.onDuty = Boolean(
          onDuty === true || onDuty === "true" || onDuty === 1 || onDuty === "1"
        );
      }
      if (notes !== undefined) staffUpdateData.notes = notes;

      if (
        regNo !== undefined &&
        regNo !== null &&
        staff &&
        regNo !== staff.regNo
      ) {
        const regExists = await Staff.findOne({
          where: {
            regNo,
            id: { [Op.ne]: staff.id },
          },
          transaction,
        });

        if (regExists) {
          if (transaction && !transaction.finished)
            await transaction.rollback();
          return errorResponse(
            res,
            "A staff member with this registration number (regNo) already exists",
            409,
          );
        }
        staffUpdateData.regNo = regNo;
      }

      if (staff) {
        if (Object.keys(staffUpdateData).length > 0) {
          await staff.update(staffUpdateData, { transaction });
        }
      } else if (user.staffId) {
        staffUpdateData.staffId = user.staffId;
        await Staff.create(staffUpdateData, { transaction });
      }
    } else if (user.role === "client") {
      let client = await Client.findOne({
        where: { userId: user.id },
        transaction,
      });

      const clientUpdateData = {};
      if (city !== undefined) clientUpdateData.city = city;
      if (area !== undefined) clientUpdateData.area = area;
      if (address !== undefined) clientUpdateData.address = address;
      if (pincode !== undefined) clientUpdateData.pincode = pincode;
      if (landmark !== undefined) clientUpdateData.landmark = landmark;
      if (patientName !== undefined) clientUpdateData.patientName = patientName;
      if (patientAge !== undefined) clientUpdateData.patientAge = patientAge;
      if (patientGender !== undefined)
        clientUpdateData.patientGender = patientGender;
      if (relation !== undefined) clientUpdateData.relation = relation;
      if (patientType !== undefined) clientUpdateData.patientType = patientType;
      if (medicalConditions !== undefined)
        clientUpdateData.medicalConditions = medicalConditions;
      if (mobilityStatus !== undefined)
        clientUpdateData.mobilityStatus = mobilityStatus;
      if (requiredService !== undefined)
        clientUpdateData.requiredService = requiredService;
      if (preferredPlan !== undefined)
        clientUpdateData.preferredPlan = preferredPlan;
      if (preferredTiming !== undefined)
        clientUpdateData.preferredTiming = preferredTiming;
      if (expectedDuration !== undefined)
        clientUpdateData.expectedDuration = expectedDuration;
      if (specialInstructions !== undefined)
        clientUpdateData.specialInstructions = specialInstructions;
      if (emergencyName !== undefined)
        clientUpdateData.emergencyName = emergencyName;
      if (emergencyPhone !== undefined)
        clientUpdateData.emergencyPhone = emergencyPhone;
      if (emergencyRelation !== undefined)
        clientUpdateData.emergencyRelation = emergencyRelation;
      if (files !== undefined) clientUpdateData.files = files;
      if (preferredLanguage !== undefined)
        clientUpdateData.preferredLanguage = preferredLanguage;
      if (source !== undefined) clientUpdateData.source = source;
      if (status !== undefined) clientUpdateData.status = status;
      if (notes !== undefined) clientUpdateData.notes = notes;

      if (client) {
        if (Object.keys(clientUpdateData).length > 0) {
          await client.update(clientUpdateData, { transaction });
        }
      } else {
        clientUpdateData.userId = user.id;
        await Client.create(clientUpdateData, { transaction });
      }
    }

    await transaction.commit();

    // Refetch the complete updated user
    const updatedUser = await User.findByPk(user.id, {
      attributes: [
        "id",
        "staffId",
        "name",
        "email",
        "phone",
        "role",
        "isActive",
        "createdAt",
        "updatedAt",
      ],
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

    let staffProfile = updatedUser.staffProfile || null;
    if (updatedUser.role === "staff" && !staffProfile && updatedUser.staffId) {
      staffProfile = await Staff.findOne({
        where: { staffId: updatedUser.staffId },
      });
    }

    let clientProfile = updatedUser.clientProfile || null;
    if (updatedUser.role === "client" && !clientProfile) {
      clientProfile = await Client.findOne({
        where: { userId: updatedUser.id },
      });
    }

    const currentProfile =
      updatedUser.role === "staff" ? staffProfile : clientProfile;

    const responseData = {
      user: {
        id: updatedUser.id,
        staffId: updatedUser.staffId,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
      role: updatedUser.role,
      profile: currentProfile,
      staffProfile: updatedUser.role === "staff" ? staffProfile : null,
      clientProfile: updatedUser.role === "client" ? clientProfile : null,
    };

    return successResponse(res, responseData, "Profile updated successfully");
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to update profile",
      500,
      error,
    );
  }
};

/**
 * 5. Send OTP for Mobile Number Change (Staff & Client both)
 * POST /api/v1/auth/change-phone/send-otp
 */
const sendChangePhoneOtp = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(
        res,
        "Unauthorized: User ID not found in token",
        401,
      );
    }

    const { currentPhone, oldPhone, newPhone, phone } = req.body;
    const providedCurrentPhone =
      currentPhone || oldPhone || (newPhone ? phone : null);
    const targetNewPhone =
      newPhone || (currentPhone || oldPhone ? phone : null);

    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return errorResponse(res, "User not found", 404);
    }

    if (!currentUser.isActive) {
      return errorResponse(
        res,
        "Your account is inactive. Please contact support or administrator.",
        403,
      );
    }

    // Verify current phone number belongs to the authenticated user whose token was sent
    if (providedCurrentPhone) {
      const cleanCurrentPhone = normalizePhone(providedCurrentPhone);
      const cleanRegisteredPhone = normalizePhone(currentUser.phone);
      if (cleanCurrentPhone !== cleanRegisteredPhone) {
        return errorResponse(
          res,
          "The current phone number is incorrect. It does not match the registered phone number of this account.",
          400,
        );
      }
    }

    if (!targetNewPhone) {
      return errorResponse(res, "New phone number is required", 400);
    }

    const cleanNewPhone = normalizePhone(targetNewPhone);
    if (cleanNewPhone.length < 10) {
      return errorResponse(
        res,
        "Please provide a valid new phone number (at least 10 digits)",
        400,
      );
    }

    if (
      currentUser.phone &&
      normalizePhone(currentUser.phone) === cleanNewPhone
    ) {
      return errorResponse(
        res,
        "The new phone number is identical to your current phone number",
        400,
      );
    }

    // Check if another account already uses this phone number
    const existingUser = await User.findOne({
      where: {
        phone: cleanNewPhone,
        id: { [Op.ne]: userId },
      },
    });

    if (existingUser) {
      return errorResponse(
        res,
        "This phone number is already registered with another account. Please use a different phone number.",
        409,
      );
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Invalidate previous unverified OTPs for this phone & purpose
    await Otp.update(
      { isVerified: true },
      {
        where: {
          phone: cleanNewPhone,
          purpose: "phone_update",
          isVerified: false,
        },
      },
    );

    // Save new OTP record
    await Otp.create({
      phone: cleanNewPhone,
      otp: otpCode,
      purpose: "phone_update",
      expiresAt,
      isVerified: false,
    });

    logOtpToTerminal({
      channel: "SMS",
      recipient: cleanNewPhone,
      otp: otpCode,
      purpose: "phone_update",
      role: req.user?.role || "user",
      expiresInMinutes: 10,
    });

    return successResponse(
      res,
      {
        newPhone: cleanNewPhone,
        purpose: "phone_update",
        expiresInSeconds: 600,
        otp: process.env.NODE_ENV === "production" ? undefined : otpCode,
      },
      `OTP for mobile number change sent successfully to ${cleanNewPhone}`,
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to send OTP for mobile update",
      500,
      error,
    );
  }
};

/**
 * 6. Update / Change Mobile Number (Staff & Client both)
 * PATCH /api/v1/auth/change-phone
 *
 * Supports:
 *  - Direct update with new phone (if no OTP was issued)
 *  - OTP-verified update with newPhone and otp (or verificationToken)
 */
const updateMobileNumber = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(
        res,
        "Unauthorized: User ID not found in token",
        401,
      );
    }

    const {
      currentPhone,
      oldPhone: bodyOldPhone,
      newPhone,
      phone,
      otp,
      verificationToken,
    } = req.body;
    const providedCurrentPhone =
      currentPhone || bodyOldPhone || (newPhone ? phone : null);
    const targetNewPhone =
      newPhone || (currentPhone || bodyOldPhone ? phone : null);

    const user = await User.findByPk(userId);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        "Your account is inactive. Please contact administrator.",
        403,
      );
    }

    // Verify current phone number if provided
    if (providedCurrentPhone) {
      const cleanCurrentPhone = normalizePhone(providedCurrentPhone);
      const cleanRegisteredPhone = normalizePhone(user.phone);
      if (cleanCurrentPhone !== cleanRegisteredPhone) {
        return errorResponse(
          res,
          "The current phone number is incorrect. It does not match the registered phone number of this account.",
          400,
        );
      }
    }

    if (!targetNewPhone) {
      return errorResponse(res, "New phone number is required", 400);
    }

    const cleanPhone = normalizePhone(targetNewPhone);
    if (cleanPhone.length < 10) {
      return errorResponse(
        res,
        "Please provide a valid new phone number (at least 10 digits)",
        400,
      );
    }

    if (user.phone && normalizePhone(user.phone) === cleanPhone) {
      return errorResponse(
        res,
        "The new phone number is identical to your current phone number",
        400,
      );
    }

    // Verify phone is not registered by another user
    const existingUser = await User.findOne({
      where: {
        phone: cleanPhone,
        id: { [Op.ne]: userId },
      },
    });

    if (existingUser) {
      return errorResponse(
        res,
        "This phone number is already registered with another account.",
        409,
      );
    }

    // OTP verification validation
    if (otp) {
      const cleanOtp = String(otp).trim();
      const otpRecord = await Otp.findOne({
        where: {
          phone: cleanPhone,
          otp: cleanOtp,
          purpose: "phone_update",
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
          "Invalid or expired OTP for the new phone number",
          400,
        );
      }

      otpRecord.isVerified = true;
      await otpRecord.save();
    } else if (verificationToken) {
      const otpRecord = await Otp.findOne({
        where: {
          phone: cleanPhone,
          verificationToken,
          purpose: "phone_update",
          isVerified: true,
        },
      });

      if (!otpRecord) {
        return errorResponse(
          res,
          "Invalid verification token for the new phone number",
          400,
        );
      }
    } else {
      // If neither OTP nor verificationToken is supplied:
      // Check if an unverified OTP was issued in the last 10 minutes
      const pendingOtp = await Otp.findOne({
        where: {
          phone: cleanPhone,
          purpose: "phone_update",
          isVerified: false,
          expiresAt: {
            [Op.gt]: new Date(),
          },
        },
      });

      if (pendingOtp) {
        return errorResponse(
          res,
          "An OTP was requested for this new phone number. Please provide the 6-digit OTP to confirm this change.",
          400,
        );
      }
    }

    const oldPhone = user.phone;
    user.phone = cleanPhone;
    await user.save();

    // Re-issue JWT token with the new phone number
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${user.id}:${user.email || user.phone}:${salt}:${Date.now()}`)
      .digest("hex");

    const jwtSecret =
      process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const newToken = jwt.sign(
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

    // Fetch refreshed user record with profile
    const updatedUser = await User.findByPk(userId, {
      attributes: [
        "id",
        "staffId",
        "name",
        "email",
        "phone",
        "role",
        "isActive",
        "createdAt",
        "updatedAt",
      ],
      include: [
        { model: Staff, as: "staffProfile", required: false },
        { model: Client, as: "clientProfile", required: false },
      ],
    });

    const responseData = {
      user: {
        id: updatedUser.id,
        staffId: updatedUser.staffId,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
      oldPhone,
      newPhone: updatedUser.phone,
      token: newToken,
    };

    if (updatedUser.role === "staff") {
      responseData.staffProfile = updatedUser.staffProfile || null;
    } else if (updatedUser.role === "client") {
      responseData.clientProfile = updatedUser.clientProfile || null;
    }

    return successResponse(
      res,
      responseData,
      "Mobile number updated successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to update mobile number",
      500,
      error,
    );
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  staffSendOtp,
  staffVerifyOtp,
  clientSendOtp,
  clientVerifyOtp,
  getProfile,
  fetchProfile: getProfile,
  fetchProfileData: getProfile,
  getProfileData: getProfile,
  updateProfile,
  editProfile: updateProfile,
  sendChangePhoneOtp,
  updateMobileNumber,
  changeMobileNumber: updateMobileNumber,
};
