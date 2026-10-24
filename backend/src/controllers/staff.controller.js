const { Op } = require("sequelize");
const { sequelize, User, Staff, Otp } = require("../database/models");
const { errorResponse, successResponse } = require("../utills/responseHandler");
const https = require("https");
const http = require("http");
const { generateStaffId } = require("../helpers/generateStaffID");
const {
  uploadStaffDocument,
  uploadStaffFilesToCloudinary,
  deleteFromCloudinary,
  getAuthenticatedDownloadUrl,
} = require("../services/cloudinary.service");
const {
  processStaffAvailabilitySlots,
  hasAvailabilitySlotsInput,
} = require("../helpers/availabilitySlots.helper");

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
        status: isVerified ? "verified" : file.status || "pending",
        verified: isVerified,
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        notes: file.notes || null,
      };

      initialDocChecks[key] = isVerified;
    });
    return { files: normalized, docChecks: initialDocChecks };
  }

  // If inputFiles is a map / object { photo: {...}, idProof: {...} }
  Object.keys(inputFiles).forEach((rawKey) => {
    const file = inputFiles[rawKey];
    if (!file) return;

    const key = rawKey.replace(/^files[\.\[_]/, "").replace(/\]$/, "") || rawKey;
    const fileObj =
      typeof file === "string" ? { data: file, name: `${key}.jpg` } : file;
    const docId =
      fileObj.id ||
      `doc_${key}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const isVerified = Boolean(
      fileObj.verified || fileObj.status === "verified",
    );

    const dataUrl = fileObj.secure_url || fileObj.url || fileObj.data || "";
    normalized[key] = {
      ...fileObj,
      id: docId,
      key,
      name: fileObj.name || `${key}.jpg`,
      type: fileObj.type || "image/jpeg",
      size: Number(fileObj.size) || 0,
      data: dataUrl,
      url: fileObj.url || dataUrl,
      secure_url: fileObj.secure_url || dataUrl,
      public_id: fileObj.public_id || fileObj.publicId || null,
      publicId: fileObj.publicId || fileObj.public_id || null,
      status: isVerified ? "verified" : fileObj.status || "pending",
      verified: isVerified,
      uploadedAt: fileObj.uploadedAt || new Date().toISOString(),
      notes: fileObj.notes || null,
    };

    initialDocChecks[key] = isVerified;
  });

  return { files: normalized, docChecks: initialDocChecks };
};

/**
 * Enriches staff document file records for API responses:
 * - Ensures streaming viewUrl is provided for all documents
 * - Sets `data` and `url` to the backend streaming endpoint for PDFs to bypass Cloudinary CDN 401 ACL errors
 * - Automatically derives a JPG `previewUrl` for PDFs so frontends can render previews
 * - Purges any legacy "files." prefixed keys
 */
const enrichStaffFilesForResponse = (files = {}, req) => {
  if (!files || typeof files !== "object") return {};
  const baseUrl = req && req.protocol && req.get
    ? `${req.protocol}://${req.get("host")}`
    : (process.env.BACKEND_URL || "http://localhost:3000");

  const enriched = {};
  Object.keys(files).forEach((key) => {
    if (key.startsWith("files.") || key.startsWith("files[") || key.startsWith("files_")) {
      return;
    }
    const item = { ...(files[key] || {}) };
    const isPdf =
      item.type === "application/pdf" ||
      (item.name && item.name.toLowerCase().endsWith(".pdf")) ||
      (item.data && typeof item.data === "string" && item.data.toLowerCase().endsWith(".pdf"));

    // Extract publicId if missing from data/url
    if (!item.publicId && (item.data || item.url)) {
      const match = (item.data || item.url).match(/\/upload\/(?:v\d+\/)?([^\.\?]+)(?:\.([a-zA-Z0-9]+))?/);
      if (match) item.publicId = match[1];
    }

    if (item.publicId) {
      const streamUrl = `${baseUrl}/api/v1/staff/documents/view?publicId=${encodeURIComponent(item.publicId)}&filename=${encodeURIComponent(item.name || `${key}.${isPdf ? "pdf" : "jpg"}`)}`;
      item.viewUrl = streamUrl;

      // Always ensure cloudinaryUrl, data, and url contain the direct Cloudinary URL
      if (!item.cloudinaryUrl || !item.cloudinaryUrl.startsWith("http") || item.cloudinaryUrl.includes("/api/v1/staff/documents/view")) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "do2ikuzji";
        item.cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${item.publicId}.${isPdf ? "pdf" : "jpg"}`;
      }
      item.data = item.cloudinaryUrl;
      item.url = item.cloudinaryUrl;
    }

    if (isPdf) {
      const orig = item.cloudinaryUrl || item.data || item.url || "";
      if (typeof orig === "string" && orig.startsWith("http") && orig.includes("cloudinary.com")) {
        item.previewUrl = orig.replace(/\.pdf$/i, ".jpg");
      }
    }

    enriched[key] = item;
  });

  return enriched;
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
    return errorResponse(
      res,
      "Name, email, and phone number are required",
      400,
    );
  }

  const cleanPhone = String(phone)
    .replace(/[^\d+]/g, "")
    .trim();
  if (cleanPhone.length < 10) {
    return errorResponse(
      res,
      "Please provide a valid 10-digit phone number",
      400,
    );
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
  const missingStaffFields = [];
  if (!dob) missingStaffFields.push("dob");
  if (!gender) missingStaffFields.push("gender");
  if (!city) missingStaffFields.push("city");
  if (!area) missingStaffFields.push("area");
  if (!address) missingStaffFields.push("address");
  if (!qualification) missingStaffFields.push("qualification");
  if (!regNo) missingStaffFields.push("regNo");
  if (!experience) missingStaffFields.push("experience");

  if (missingStaffFields.length > 0) {
    return errorResponse(
      res,
      `Missing required staff field(s): ${missingStaffFields.join(", ")}`,
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
      return errorResponse(
        res,
        "A user with this phone number already exists",
        409,
      );
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
    return errorResponse(
      res,
      err.message || "Database validation failed",
      500,
      err,
    );
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
    let cloudinaryFiles = {};
    if (files && typeof files === "object" && Object.keys(files).length > 0) {
      try {
        const fileEntries = Array.isArray(files)
          ? files.map((f, i) => [f.k || f.key || `doc_${i}`, f])
          : Object.entries(files);

        for (const [key, fileData] of fileEntries) {
          if (!fileData) continue;
          const cleanKey = key.replace(/^files[\.\[_]/, "").replace(/\]$/, "") || key;
          const uploaded = await uploadStaffDocument(fileData, { docKey: cleanKey });
          cloudinaryFiles[cleanKey] = uploaded;
        }
      } catch (uploadErr) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return errorResponse(res, `Staff document upload failed: ${uploadErr.message}`, 400, uploadErr);
      }
    } else {
      cloudinaryFiles = await uploadStaffFilesToCloudinary(req);
    }

    const { files: normalizedFiles, docChecks: initialDocChecks } =
      normalizeStaffFiles(cloudinaryFiles);
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
        language: Array.isArray(language)
          ? language
          : language
            ? [language]
            : [],
        availability: Array.isArray(availability)
          ? availability
          : availability
            ? [availability]
            : [],
        availabilitySlots: hasAvailabilitySlotsInput(req.body)
          ? processStaffAvailabilitySlots(req.body, [])
          : [],
        emergencyName: emergencyName || null,
        emergencyPhone: emergencyPhone || null,
        emergencyRelation: emergencyRelation || null,
        files: normalizedFiles,
        docChecks: initialDocChecks,
        applied: applied !== undefined ? applied : true,
        approval: approval || "pending",
        registrationStatus: "submitted",
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

    const staffData = newStaff.toJSON ? newStaff.toJSON() : newStaff;
    staffData.files = enrichStaffFilesForResponse(staffData.files, req);

    return successResponse(
      res,
      {
        user: sanitizedUser,
        staff: staffData,
      },
      Object.keys(cloudinaryFiles || {}).length > 0
        ? "Staff registered successfully with Cloudinary documents"
        : "Staff registered successfully",
      201,
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      const fieldNames =
        error.errors?.map((e) => e.path) || Object.keys(error.fields || {});
      if (
        fieldNames.includes("regNo") ||
        (error.message && error.message.includes("regNo"))
      ) {
        return errorResponse(
          res,
          "A staff member with this registration number (regNo) already exists",
          409,
        );
      }
      if (
        fieldNames.includes("email") ||
        (error.message && error.message.includes("email"))
      ) {
        return errorResponse(res, "A user with this email already exists", 409);
      }
      if (
        fieldNames.includes("staffId") ||
        (error.message && error.message.includes("staffId"))
      ) {
        return errorResponse(
          res,
          "Staff ID already exists. Please retry.",
          409,
        );
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
    const staffId = req.user?.staffId || req.body?.staffId || req.params.staffId;
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
      return errorResponse(
        res,
        "Staff ID is required to update application",
        400,
      );
    }

    const staff = await Staff.findOne({
      where: { staffId },
      include: [{ model: User, as: "user" }],
      transaction,
    });

    if (!staff) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Staff member with ID '${staffId}' not found`,
        404,
      );
    }

    // Normalize existing files in case they had legacy "files." prefix
    const cleanExistingFiles = {};
    const cleanExistingDocChecks = {};
    const existingFileKeys = Object.keys(staff.files || {}).sort((a, b) => {
      const aIsLegacy = a.startsWith("files.") || a.startsWith("files[");
      const bIsLegacy = b.startsWith("files.") || b.startsWith("files[");
      if (aIsLegacy && !bIsLegacy) return -1;
      if (!aIsLegacy && bIsLegacy) return 1;
      return 0;
    });

    existingFileKeys.forEach((k) => {
      const cleanKey = k.replace(/^files[\.\[_]/, "").replace(/\]$/, "");
      cleanExistingFiles[cleanKey] = {
        ...(staff.files[k] || {}),
        key: cleanKey,
      };
      cleanExistingDocChecks[cleanKey] = (staff.docChecks || {})[k] || false;
    });

    const updatedFiles = { ...cleanExistingFiles };
    const updatedDocChecks = { ...cleanExistingDocChecks };

    let newUploadedFiles = {};
    if (files && typeof files === "object" && Object.keys(files).length > 0) {
      try {
        const fileEntries = Array.isArray(files)
          ? files.map((f, i) => [f.k || f.key || `doc_${i}`, f])
          : Object.entries(files);

        for (const [key, fileData] of fileEntries) {
          if (!fileData) continue;
          const cleanKey = key.replace(/^files[\.\[_]/, "").replace(/\]$/, "") || key;
          const oldFile = staff.files?.[cleanKey] || staff.files?.[key];
          if (oldFile && (oldFile.public_id || oldFile.publicId)) {
            const pubId = oldFile.public_id || oldFile.publicId;
            const resType = oldFile.resource_type || "image";
            try {
              await deleteFromCloudinary(pubId, resType);
            } catch (_) {}
          }
          const uploaded = await uploadStaffDocument(fileData, { docKey: cleanKey });
          newUploadedFiles[cleanKey] = uploaded;
        }
      } catch (uploadErr) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return errorResponse(res, `Failed to upload updated document: ${uploadErr.message}`, 400, uploadErr);
      }
    } else {
      newUploadedFiles = await uploadStaffFilesToCloudinary(req);
    }

    const combinedFiles = newUploadedFiles;

    if (Object.keys(combinedFiles).length > 0) {
      const { files: normalizedNewFiles } = normalizeStaffFiles(combinedFiles);
      // Merge new files into existing files
      Object.keys(normalizedNewFiles).forEach((key) => {
        updatedFiles[key] = normalizedNewFiles[key];
        updatedDocChecks[key] = false; // Reset verification state when a file is re-uploaded
      });
    }

    // Ensure absolutely no legacy prefixed keys persist in updatedFiles or docChecks
    Object.keys(updatedFiles).forEach((k) => {
      if (k.startsWith("files.") || k.startsWith("files[") || k.startsWith("files_")) {
        delete updatedFiles[k];
      }
    });
    Object.keys(updatedDocChecks).forEach((k) => {
      if (k.startsWith("files.") || k.startsWith("files[") || k.startsWith("files_")) {
        delete updatedDocChecks[k];
      }
    });

    const now = new Date();
    const historyItem = {
      at: now.toISOString(),
      status: "pending",
      by: "applicant",
      note: note || "Application updated and re-submitted for review",
    };

    const existingHistory = Array.isArray(staff.appHistory)
      ? staff.appHistory
      : [];
    const updatedHistory = [...existingHistory, historyItem];

    await staff.update(
      {
        files: updatedFiles,
        docChecks: updatedDocChecks,
        approval: "pending",
        docs: "pending",
        reviewNote: null,
        skills: skills
          ? Array.isArray(skills)
            ? skills
            : [skills]
          : staff.skills,
        availability: availability
          ? Array.isArray(availability)
            ? availability
            : [availability]
          : staff.availability,
        availabilitySlots: hasAvailabilitySlotsInput(req.body)
          ? processStaffAvailabilitySlots(req.body, staff.availabilitySlots)
          : staff.availabilitySlots,
        language: language
          ? Array.isArray(language)
            ? language
            : [language]
          : staff.language,
        emergencyName:
          emergencyName !== undefined ? emergencyName : staff.emergencyName,
        emergencyPhone:
          emergencyPhone !== undefined ? emergencyPhone : staff.emergencyPhone,
        emergencyRelation:
          emergencyRelation !== undefined
            ? emergencyRelation
            : staff.emergencyRelation,
        appHistory: updatedHistory,
        registrationStatus: "submitted",
        approval: "pending",
        docs: "pending",
        reviewNote: null,
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
          attributes: [
            "id",
            "staffId",
            "name",
            "email",
            "phone",
            "role",
            "isActive",
          ],
        },
      ],
    });

    const staffData = refreshedStaff.toJSON ? refreshedStaff.toJSON() : refreshedStaff;
    staffData.files = enrichStaffFilesForResponse(staffData.files, req);

    return successResponse(
      res,
      staffData,
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

/**
 * Track Staff Application Status
 * Accepts staffId via URL parameter (e.g. /application/status/:staffId or /application/:staffId/status),
 * query parameter (?staffId=...), or authenticated user token.
 * GET /api/v1/staff/application/status/:staffId
 */
const trackApplication = async (req, res) => {
  try {
    const staffIdentifier = (
      req.params.staffId ||
      req.params.id ||
      req.query.staffId ||
      req.user?.staffId ||
      ""
    ).trim();

    if (!staffIdentifier) {
      return errorResponse(
        res,
        "Staff ID ('staffId') is required in URL parameter to track registration status",
        400,
      );
    }

    const isNumeric = !isNaN(Number(staffIdentifier)) && /^\d+$/.test(staffIdentifier);
    const whereClause = isNumeric
      ? { [Op.or]: [{ id: Number(staffIdentifier) }, { staffId: staffIdentifier }] }
      : { staffId: staffIdentifier };

    const staff = await Staff.findOne({
      where: whereClause,
      attributes: [
        "id",
        "staffId",
        "registrationStatus",
        "approval",
        "docs",
        "applied",
        "files",
        "docChecks",
        "reviewNote",
        "reviewedAt",
        "submittedAt",
        "approvedAt",
        "rejectedAt",
        "availability",
        "availabilitySlots",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email", "phone"],
        },
      ],
    });

    if (!staff) {
      return errorResponse(
        res,
        `Registration record not found for staff ID '${staffIdentifier}'`,
        404,
      );
    }

    const data = {
      id: staff.id,
      staffId: staff.staffId,
      applicant: staff.user
        ? {
            name: staff.user.name,
            email: staff.user.email,
            phone: staff.user.phone,
          }
        : null,
      registrationStatus: staff.registrationStatus,
      approval: staff.approval,
      documentStatus: staff.docs,
      applied: staff.applied,
      files: enrichStaffFilesForResponse(staff.files || {}, req),
      docChecks: staff.docChecks || {},
      reviewNote: staff.reviewNote,
      reviewedAt: staff.reviewedAt,
      submittedAt: staff.submittedAt,
      approvedAt: staff.approvedAt,
      rejectedAt: staff.rejectedAt,
      lastUpdatedAt: staff.updatedAt,
    };

    return successResponse(
      res,
      data,
      "Registration status retrieved successfully",
      200,
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to track registration status",
      500,
      error,
    );
  }
};

/**
 * Stream/view staff document (especially PDFs) directly in browser.
 * Bypasses Cloudinary ACL restrictions using authenticated signed retrieval.
 * GET /api/v1/staff/documents/view
 * GET /api/v1/staff/:staffId/files/:fileKey/view
 */
const viewStaffDocument = async (req, res) => {
  try {
    let publicId = (req.query.publicId || req.query.id || "").trim();
    let format = (req.query.format || "").trim();
    let filename = (req.query.filename || "").trim();
    const isDownload = req.query.download === "true";

    // 1. If staffId and fileKey are provided in route params or query
    const staffId = req.params.staffId || req.query.staffId;
    const fileKey = req.params.fileKey || req.params.docKey || req.query.fileKey;

    if (staffId && fileKey) {
      const staff = await Staff.findOne({ where: { staffId } });
      const doc = staff?.files?.[fileKey];
      if (doc) {
        publicId = doc.publicId || publicId;
        filename = doc.name || filename;
        if (doc.type === "application/pdf") format = "pdf";
        if (!publicId && (doc.data || doc.url)) {
          const match = (doc.data || doc.url).match(/\/upload\/(?:v\d+\/)?([^\.\?]+)(?:\.([a-zA-Z0-9]+))?/);
          if (match) {
            publicId = match[1];
            if (!format && match[2]) format = match[2];
          }
        }
      }
    }

    // 2. If a Cloudinary URL was provided in ?url=
    if (!publicId && req.query.url) {
      const parsedUrl = req.query.url;
      const uploadIdx = parsedUrl.indexOf('/upload/');
      if (uploadIdx !== -1) {
        const withoutQuery = parsedUrl.slice(uploadIdx + 8).split('?')[0];
        const strippedVer = withoutQuery.replace(/^v\d+\//, '');
        const lastDot = strippedVer.lastIndexOf('.');
        if (lastDot !== -1) {
          publicId = strippedVer.slice(0, lastDot);
          if (!format) format = strippedVer.slice(lastDot + 1);
        } else {
          publicId = strippedVer;
        }
      } else {
        const match = parsedUrl.match(/\/upload\/(?:v\d+\/)?([^\?]+)/);
        if (match) {
          const part = match[1];
          const lastDot = part.lastIndexOf('.');
          publicId = lastDot !== -1 ? part.slice(0, lastDot) : part;
          if (!format && lastDot !== -1) format = part.slice(lastDot + 1);
        }
      }
    }

    if (!publicId) {
      return errorResponse(res, "Document publicId or URL is required", 400);
    }

    // Determine format if not yet known
    if (!format) {
      const extMatch = publicId.match(/\.([a-zA-Z0-9]+)$/);
      format = extMatch ? extMatch[1] : (filename && filename.includes(".") ? filename.split(".").pop() : "pdf");
    }

    if (!filename) {
      filename = `${publicId.split("/").pop()}.${format}`;
    }

    const isPdf = format.toLowerCase() === "pdf" || filename.toLowerCase().endsWith(".pdf");
    const contentType = isPdf ? "application/pdf" : (format.toLowerCase() === "png" ? "image/png" : "image/jpeg");

    // Generate authenticated signed URL to bypass Cloudinary default ACL restrictions
    const signedFetchUrl = getAuthenticatedDownloadUrl(publicId, format, "image");

    if (!signedFetchUrl) {
      return errorResponse(res, "Cloudinary is not configured", 500);
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(filename)}"`
    );

    const client = signedFetchUrl.startsWith("https") ? https : http;
    client.get(signedFetchUrl, (cldRes) => {
      if (cldRes.statusCode === 200) {
        if (cldRes.headers["content-length"]) {
          res.setHeader("Content-Length", cldRes.headers["content-length"]);
        }
        return cldRes.pipe(res);
      }

      // If signed download URL fails, try direct streaming from Cloudinary CDN
      const fallbackUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.${format}`;
      https.get(fallbackUrl, (fbRes) => {
        if (fbRes.statusCode === 200) {
          return fbRes.pipe(res);
        }
        return res.status(cldRes.statusCode || 404).json({
          success: false,
          message: "Unable to load document",
          error: cldRes.headers["x-cld-error"] || "Document not accessible",
        });
      }).on("error", (err) => {
        return errorResponse(res, err.message, 500);
      });
    }).on("error", (err) => {
      return errorResponse(res, err.message, 500);
    });
  } catch (error) {
    return errorResponse(res, error.message || "Failed to stream document", 500, error);
  }
};

module.exports = {
  staffRegistration,
  updateStaffApplication,
  trackApplication,
  viewStaffDocument,
};
