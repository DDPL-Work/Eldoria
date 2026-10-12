const { sequelize, User, Staff, Otp } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");
const { generateStaffId } = require("../helpers/generateStaffID");

/**
 * Staff Registration Controller
 * Registers a staff member by creating both User credentials and Staff profile
 * Requires that the phone number has been verified via OTP prior to registration
 */
const staffRegistration = async (req, res) => {
  // 1. Guard against missing or unparsed request body
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Object.keys(req.body).length === 0
  ) {
    return errorResponse(
      res,
      "Request body is missing or empty. Please ensure you are sending a JSON payload with 'Content-Type: application/json' header.",
      400,
    );
  }

  const {
    name,
    email,
    phone,
    verificationToken,
    dob,
    gender,
    city,
    area,
    address,
    qualification,
    regNo,
    experience,
    skills,
    language,
    availability,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
    files,
    applied,
    approval,
    docs,
    onDuty,
    submittedAt,
    notes,
  } = req.body;

  // 2. Validate required user credentials
  if (!name || !email || !phone) {
    return errorResponse(res, "Name, email, and phone number are required", 400);
  }

  const cleanPhone = String(phone).replace(/[^\d+]/g, "").trim();
  if (cleanPhone.length < 10) {
    return errorResponse(res, "Please provide a valid 10-digit phone number", 400);
  }

  // 3. Verify that phone number was verified via OTP for registration
  try {
    const verifiedOtp = await Otp.findOne({
      where: {
        phone: cleanPhone,
        purpose: "registration",
        isVerified: true,
        ...(verificationToken ? { verificationToken } : {}),
      },
      order: [["id", "DESC"]],
    });

    if (!verifiedOtp) {
      return errorResponse(
        res,
        "Phone number has not been verified. Please verify your phone number with OTP first.",
        400,
      );
    }
  } catch (otpErr) {
    return errorResponse(res, "Failed to verify phone OTP status", 500, otpErr);
  }

  // 4. Validate required staff profile details
  if (
    !dob ||
    !gender ||
    !city ||
    !area ||
    !address ||
    !qualification ||
    !regNo ||
    !experience
  ) {
    return errorResponse(
      res,
      "Missing required staff fields: dob, gender, city, area, address, qualification, regNo, and experience are required",
      400,
    );
  }

  // Validate gender enum
  const normalizedGender = String(gender).toLowerCase().trim();
  if (!["male", "female", "others"].includes(normalizedGender)) {
    return errorResponse(
      res,
      "Gender must be one of: 'male', 'female', 'others'",
      400,
    );
  }

  // 5. Pre-check for duplicate email & phone
  try {
    const existingUser = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
      return errorResponse(res, "A user with this email already exists", 409);
    }

    const existingPhoneUser = await User.findOne({
      where: { phone: cleanPhone },
    });
    if (existingPhoneUser) {
      return errorResponse(res, "A user with this phone number already exists", 409);
    }

    // 6. Pre-check for duplicate registration number
    const existingStaff = await Staff.findOne({
      where: { regNo: regNo.trim() },
    });
    if (existingStaff) {
      return errorResponse(
        res,
        "A staff member with this registration number (regNo) already exists",
        409,
      );
    }
  } catch (err) {
    return errorResponse(res, err.message || "Database validation failed", 500, err);
  }

  // 7. Begin database transaction for atomic record creation
  let transaction;
  try {
    transaction = await sequelize.transaction();

    // Generate formatted Staff ID: ELDO{YY}{City}{Gender}{Serial}
    const staffId = await generateStaffId(city, normalizedGender, transaction);

    // Create User record (role: 'staff')
    const newUser = await User.create(
      {
        staffId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: "staff",
        phone: cleanPhone,
        isActive: true,
      },
      { transaction },
    );

    // Create Staff profile record
    const newStaff = await Staff.create(
      {
        staffId,
        dob,
        gender: normalizedGender,
        city: city.trim(),
        area: area.trim(),
        address: address.trim(),
        qualification: qualification.trim(),
        regNo: regNo.trim(),
        experience: experience.trim(),
        skills: Array.isArray(skills) ? skills : skills ? [skills] : [],
        language: Array.isArray(language) ? language : language ? [language] : [],
        availability: Array.isArray(availability)
          ? availability
          : availability
          ? [availability]
          : [],
        emergencyName: emergencyName || null,
        emergencyPhone: emergencyPhone || null,
        emergencyRelation: emergencyRelation || null,
        files: files || {},
        applied: applied !== undefined ? applied : true,
        approval: approval || "pending",
        docs: docs || "pending",
        onDuty: onDuty !== undefined ? onDuty : false,
        submittedAt: submittedAt || new Date(),
        notes: notes || null,
      },
      { transaction },
    );

    // Commit both records atomically
    await transaction.commit();

    // Sanitize user output (exclude password)
    const sanitizedUser = {
      id: newUser.id,
      staffId: newUser.staffId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    };

    return successResponse(
      res,
      {
        user: sanitizedUser,
        staff: newStaff,
      },
      "Staff registered successfully",
      201,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      const fieldNames =
        error.errors?.map((e) => e.path) || Object.keys(error.fields || {});
      if (fieldNames.includes("regNo") || (error.message && error.message.includes("regNo"))) {
        return errorResponse(
          res,
          "A staff member with this registration number (regNo) already exists",
          409,
        );
      }
      if (fieldNames.includes("email") || (error.message && error.message.includes("email"))) {
        return errorResponse(res, "A user with this email already exists", 409);
      }
      if (fieldNames.includes("staffId") || (error.message && error.message.includes("staffId"))) {
        return errorResponse(res, "Staff ID already exists. Please retry.", 409);
      }
    }

    return errorResponse(
      res,
      error.message || "Failed to register staff",
      500,
      error,
    );
  }
};

module.exports = {
  staffRegistration,
};