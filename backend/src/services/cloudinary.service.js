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
 * Generates an authenticated signed download/view URL for a Cloudinary asset,
 * bypassing public CDN delivery restrictions for PDFs/ZIPs.
 * @param {string} publicId
 * @param {string} format
 * @param {string} resourceType
 * @returns {string} Signed download URL
 */
const getAuthenticatedDownloadUrl = (publicId, format = 'pdf', resourceType = 'image') => {
  if (!isCloudinaryConfigured() || !publicId) return '';
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: 'upload',
    attachment: false,
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

/**
 * Helper to upload all staff documents present in request (multipart req.files or base64/JSON in req.body.files)
 * to Cloudinary and return a map of document objects.
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Map of document records
 */
const uploadStaffFilesToCloudinary = async (req) => {
  const resultFiles = {};
  const baseUrl = req && req.protocol && req.get
    ? `${req.protocol}://${req.get('host')}`
    : (process.env.BACKEND_URL || 'http://localhost:3000');

  // 1. Process files from multipart/form-data (via multer memoryStorage: req.files or req.filesMap)
  const filesList = Array.isArray(req.files) ? req.files : [];

  for (const file of filesList) {
    const rawKey = file.fieldname || 'document';
    // Clean key if sent like "files.photo", "files[photo]", "files_photo" -> "photo"
    const key = rawKey.replace(/^files[\.\[_]/, '').replace(/\]$/, '') || rawKey;
    const originalname = file.originalname || `${key}.jpg`;
    const mimetype = file.mimetype || 'image/jpeg';
    const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

    let fileUrl = '';
    let publicId = null;

    if (isCloudinaryConfigured() && file.buffer) {
      try {
        const uploadResult = await uploadToCloudinary(file.buffer, {
          folder: process.env.CLOUDINARY_FOLDER || 'eldoria/staff_documents',
          resource_type: 'auto',
          public_id: `${cleanKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        });
        fileUrl = uploadResult.secure_url || uploadResult.url;
        publicId = uploadResult.public_id;
      } catch (err) {
        console.warn(`⚠️ Cloudinary upload failed for ${originalname}, falling back to base64 data URI:`, err.message);
        fileUrl = `data:${mimetype};base64,${file.buffer.toString('base64')}`;
      }
    } else if (file.buffer) {
      fileUrl = `data:${mimetype};base64,${file.buffer.toString('base64')}`;
    }

    const isPdf = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf');
    const previewUrl = isPdf && fileUrl && fileUrl.startsWith('http')
      ? fileUrl.replace(/\.pdf$/i, '.jpg')
      : fileUrl;

    const streamViewUrl = publicId
      ? `${baseUrl}/api/v1/staff/documents/view?publicId=${encodeURIComponent(publicId)}&filename=${encodeURIComponent(originalname)}`
      : fileUrl;

    resultFiles[key] = {
      id: `doc_${key}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      key,
      name: originalname,
      type: mimetype,
      size: file.size || 0,
      data: isPdf ? streamViewUrl : fileUrl,
      url: isPdf ? streamViewUrl : fileUrl,
      viewUrl: streamViewUrl,
      cloudinaryUrl: fileUrl,
      previewUrl,
      publicId,
      status: 'pending',
      verified: false,
      uploadedAt: new Date().toISOString(),
    };
  }

  // 2. Process JSON / base64 files from req.body.files (if provided)
  let bodyFiles = req.body?.files;
  if (typeof bodyFiles === 'string') {
    try {
      bodyFiles = JSON.parse(bodyFiles);
    } catch (_) {
      // not JSON string
    }
  }

  if (bodyFiles && typeof bodyFiles === 'object') {
    const entries = Array.isArray(bodyFiles)
      ? bodyFiles.map((f, i) => [f.k || f.key || `doc_${i}`, f])
      : Object.entries(bodyFiles);

    for (const [rawKey, fileObj] of entries) {
      if (!fileObj) continue;

      const key = rawKey.replace(/^files[\.\[_]/, '').replace(/\]$/, '') || rawKey;
      if (resultFiles[key]) continue; // don't overwrite if multipart already provided it

      const rawData = fileObj.data || fileObj.url || '';
      let fileUrl = rawData;
      let publicId = fileObj.publicId || null;
      const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

      // If rawData is base64 and Cloudinary is configured, upload it
      if (isCloudinaryConfigured() && typeof rawData === 'string' && rawData.startsWith('data:')) {
        try {
          const uploadRes = await cloudinary.uploader.upload(rawData, {
            folder: process.env.CLOUDINARY_FOLDER || 'eldoria/staff_documents',
            resource_type: 'auto',
            public_id: `${cleanKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          });
          fileUrl = uploadRes.secure_url || uploadRes.url;
          publicId = uploadRes.public_id;
        } catch (err) {
          console.warn(`⚠️ Cloudinary base64 upload failed for ${key}, keeping original data:`, err.message);
        }
      }

      const isPdfObj = (fileObj.type === 'application/pdf') || (fileObj.name && fileObj.name.toLowerCase().endsWith('.pdf'));
      const previewUrl = isPdfObj && fileUrl && fileUrl.startsWith('http')
        ? fileUrl.replace(/\.pdf$/i, '.jpg')
        : fileUrl;

      const streamViewUrl = publicId
        ? `${baseUrl}/api/v1/staff/documents/view?publicId=${encodeURIComponent(publicId)}&filename=${encodeURIComponent(fileObj.name || `${key}.pdf`)}`
        : fileUrl;

      resultFiles[key] = {
        id: fileObj.id || `doc_${key}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
        key,
        name: fileObj.name || `${key}.jpg`,
        type: fileObj.type || 'image/jpeg',
        size: Number(fileObj.size) || 0,
        data: isPdfObj ? streamViewUrl : fileUrl,
        url: isPdfObj ? streamViewUrl : fileUrl,
        viewUrl: streamViewUrl,
        cloudinaryUrl: fileUrl,
        previewUrl,
        publicId,
        status: fileObj.status || 'pending',
        verified: Boolean(fileObj.verified),
        uploadedAt: fileObj.uploadedAt || new Date().toISOString(),
      };
    }
  }

  return resultFiles;
};

module.exports = {
  isValidDocumentType,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadStaffFilesToCloudinary,
  getAuthenticatedDownloadUrl,
};
