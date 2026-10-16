const { sequelize, User, Staff, Otp } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");
const { generateStaffId } = require("../helpers/generateStaffID");

/**
 * Helper to normalize staff uploaded documents:
 * Assigns unique document ID, initial verification status ("pending"),
 * verified boolean flag (false), and metadata for each uploaded file.
 */
const normalizeStaffFiles = (inputFiles = {}) => {
  const normalized = {};
  const initialDocChecks = {};

  if (!inputFiles || typeof inputFiles !== "object") {
    return { files: normalized, docChecks: initialDocChecks };
  }

  // If inputFiles is an array of objects
  if (Array.isArray(inputFiles)) {
    inputFiles.forEach((file, index) => {
      if (!file) return;
      const key = file.k || file.key || file.type || `doc_${index}`;
      const docId =
        file.id ||
        `doc_${key}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const isVerified = Boolean(file.verified || file.status === "verified");

      normalized[key] = {
        id: docId,
        key,
        name: file.name || `${key}.jpg`,
        type: file.type || "image/jpeg",
        size: Number(file.size) || 0,
        data: file.data || file.url || "",
        status: isVerified ? "verified" : (file.status || "pending"),
        verified: isVerified,
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        notes: file.notes || null,
      };

      initialDocChecks[key] = isVerified;
    });
    return { files: normalized, docChecks: initialDocChecks };
  }

  // If inputFiles is a map / object { photo: {...}, idProof: {...} }
  Object.keys(inputFiles).forEach((key) => {
    const file = inputFiles[key];
    if (!file) return;

    const fileObj = typeof file === "string" ? { data: file, name: `${key}.jpg` } : file;
    const docId =
      fileObj.id ||
      `doc_${key}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const isVerified = Boolean(fileObj.verified || fileObj.status === "verified");

    normalized[key] = {
      id: docId,
      key,
      name: fileObj.name || `${key}.jpg`,
      type: fileObj.type || "image/jpeg",
      size: Number(fileObj.size) || 0,
      data: fileObj.data || fileObj.url || "",
      status: isVerified ? "verified" : (fileObj.status || "pending"),
      verified: isVerified,
      uploadedAt: fileObj.uploadedAt || new Date().toISOString(),
      notes: fileObj.notes || null,
    };

    initialDocChecks[key] = isVerified;
  });

  return { files: normalized, docChecks: initialDocChecks };
};

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

    // Normalize documents: assign unique id, status, verified flag, and initialize docChecks
    const { files: normalizedFiles, docChecks: initialDocChecks } = normalizeStaffFiles(files);
    const now = new Date();

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
        files: normalizedFiles,
        docChecks: initialDocChecks,
        applied: applied !== undefined ? applied : true,
        approval: approval || "pending",
        docs: docs || "pending",
        reviewNote: null,
        reviewedAt: null,
        appHistory: [
          {
            at: now.toISOString(),
            status: approval || "pending",
            by: "applicant",
            note: "Application submitted",
          },
        ],
        onDuty: onDuty !== undefined ? onDuty : false,
        submittedAt: submittedAt || now,
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

/**
 * Update Staff Application / Re-upload documents
 * Used when changes are requested by admin or staff needs to submit updated files
 * PATCH /api/v1/staff/application
 */
const updateStaffApplication = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const staffId = req.user?.staffId || req.body?.staffId;
    const {
      files,
      skills,
      availability,
      language,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      note,
    } = req.body;

    if (!staffId) {
      await transaction.rollback();
      return errorResponse(res, "Staff ID is required to update application", 400);
    }

    const staff = await Staff.findOne({
      where: { staffId },
      include: [{ model: User, as: "user" }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(res, `Staff member with ID '${staffId}' not found`, 404);
    }

    const updatedFiles = { ...(staff.files || {}) };
    const updatedDocChecks = { ...(staff.docChecks || {}) };

    if (files && typeof files === "object") {
      const { files: normalizedNewFiles } = normalizeStaffFiles(files);
      // Merge new files into existing files
      Object.keys(normalizedNewFiles).forEach((key) => {
        updatedFiles[key] = normalizedNewFiles[key];
        updatedDocChecks[key] = false; // Reset verification state when a file is re-uploaded
      });
    }

    const now = new Date();
    const historyItem = {
      at: now.toISOString(),
      status: "pending",
      by: "applicant",
      note: note || "Application updated and re-submitted for review",
    };

    const existingHistory = Array.isArray(staff.appHistory) ? staff.appHistory : [];
    const updatedHistory = [...existingHistory, historyItem];

    await staff.update(
      {
        files: updatedFiles,
        docChecks: updatedDocChecks,
        approval: "pending",
        docs: "pending",
        reviewNote: null,
        skills: skills ? (Array.isArray(skills) ? skills : [skills]) : staff.skills,
        availability: availability
          ? (Array.isArray(availability) ? availability : [availability])
          : staff.availability,
        language: language
          ? (Array.isArray(language) ? language : [language])
          : staff.language,
        emergencyName: emergencyName !== undefined ? emergencyName : staff.emergencyName,
        emergencyPhone: emergencyPhone !== undefined ? emergencyPhone : staff.emergencyPhone,
        emergencyRelation:
          emergencyRelation !== undefined ? emergencyRelation : staff.emergencyRelation,
        appHistory: updatedHistory,
      },
      { transaction },
    );

    await transaction.commit();

    const refreshedStaff = await Staff.findOne({
      where: { staffId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "staffId", "name", "email", "phone", "role", "isActive"],
        },
      ],
    });

    return successResponse(
      res,
      refreshedStaff,
      "Staff application updated and re-submitted for review successfully",
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(
      res,
      error.message || "Failed to update staff application",
      500,
      error,
    );
  }
};

module.exports = {
  staffRegistration,
  updateStaffApplication,
};