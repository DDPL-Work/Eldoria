const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../configs/cloudinary.config');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Validates if the file is an acceptable document type (PDF or Image).
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {boolean}
 */
const isValidDocumentType = (mimetype = '', originalname = '') => {
  if (mimetype && ALLOWED_MIME_TYPES.includes(mimetype.toLowerCase())) {
    return true;
  }
  if (originalname) {
    const ext = path.extname(originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      return true;
    }
  }
  return false;
};

/**
 * Uploads a file buffer directly to Cloudinary via stream.
 * @param {Buffer} buffer - In-memory file buffer
 * @param {Object} options - Upload options (folder, resource_type, public_id, etc.)
 * @returns {Promise<Object>} Cloudinary upload response
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error('Cloudinary credentials are not configured in environment variables.'));
    }

    const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'eldoria/staff_documents';
    const resourceType = options.resource_type || 'auto';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes a file from Cloudinary by its public ID.
 * @param {string} publicId
 * @param {string} resourceType
 * @returns {Promise<Object>}
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!isCloudinaryConfigured() || !publicId) {
    return null;
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = {
  isValidDocumentType,
  uploadToCloudinary,
  deleteFromCloudinary,
};
