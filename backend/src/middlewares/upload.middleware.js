const multer = require('multer');
const { isValidDocumentType } = require('../services/cloudinary.service');
const { errorResponse } = require('../utills/responseHandler');

// 1. Memory storage for direct in-memory upload to Cloudinary (no orphaned disk files)
const storage = multer.memoryStorage();

// 2. Strict file filter: Only PDF or Image files
const fileFilter = (req, file, cb) => {
  if (isValidDocumentType(file.mimetype, file.originalname)) {
    cb(null, true);
  } else {
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    error.message = `Unsupported file type '${file.mimetype}' for '${file.fieldname}'. Only PDF and image formats (JPG, PNG, WEBP, GIF) are allowed.`;
    cb(error, false);
  }
};

// 3. Configure multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per document
    files: 10, // Max 10 files per request
  },
});

/**
 * Middleware for staff document uploads.
 * Supports:
 * - multipart/form-data requests with any document field names (e.g. photo, idProof, qualification, etc.)
 * - application/json requests (passes through seamlessly for base64 / json payloads)
 */
const uploadStaffFiles = (req, res, next) => {
  // If not multipart, let express.json handle the body
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  // Use multer's .any() to allow named document keys (photo, idProof, qualification, experience, police, etc.)
  upload.any()(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(
            res,
            `File size exceeds 10MB limit: ${err.field || 'One of the files'} is too large.`,
            400
          );
        }
        return errorResponse(res, err.message || 'File upload error', 400);
      }
      return errorResponse(
        res,
        err.message || 'Failed to process uploaded files. Only PDF and image formats are allowed.',
        400
      );
    }

    // Convert multer req.files array to map by fieldname for convenient access
    if (Array.isArray(req.files) && req.files.length > 0) {
      req.filesMap = {};
      req.files.forEach((file) => {
        req.filesMap[file.fieldname] = file;
      });
    }

    next();
  });
};

module.exports = {
  uploadStaffFiles,
  upload,
};
