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
  if (!mimetype && !originalname) return false;

  const mime = (mimetype || '').toLowerCase().trim();
  const ext = path.extname(originalname || '').toLowerCase().trim();

  // If extension is present, it MUST be in ALLOWED_EXTENSIONS (rejects .exe, .php, etc.)
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }

  // If mimetype is present, it MUST be in ALLOWED_MIME_TYPES
  if (mime && !ALLOWED_MIME_TYPES.includes(mime)) {
    return false;
  }

  // At least one must be explicitly valid
  const isMimeAllowed = mime ? ALLOWED_MIME_TYPES.includes(mime) : false;
  const isExtAllowed = ext ? ALLOWED_EXTENSIONS.includes(ext) : false;

  return isMimeAllowed || isExtAllowed;
};

/**
 * Checks whether a file is a PDF document based on mimetype or filename.
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {boolean}
 */
const isPdfDocument = (mimetype = '', originalname = '') => {
  const ext = (path.extname(originalname || '') || '').toLowerCase();
  return (
    (typeof mimetype === 'string' && mimetype.toLowerCase() === 'application/pdf') ||
    ext === '.pdf'
  );
};

/**
 * Uploads a single staff document to Cloudinary (supports base64, URL, or file object).
 * @param {string|Object} fileInput
 * @param {Object} options - { docKey, name }
 * @returns {Promise<Object>} Document object
 */
const uploadStaffDocument = async (fileInput, options = {}) => {
  const fileName = (typeof fileInput === 'object' && fileInput?.name)
    ? fileInput.name
    : (options.name || `${options.docKey || 'document'}.jpg`);
  const docKey = options.docKey || (typeof fileInput === 'object' && fileInput?.key) || 'document';
  const rawData = typeof fileInput === 'string' ? fileInput : fileInput?.data || fileInput?.url || '';
  const fileType = typeof fileInput === 'object' && fileInput?.type
    ? fileInput.type
    : (isPdfDocument('', fileName) ? 'application/pdf' : 'image/jpeg');

  if (!isValidDocumentType(fileType, fileName)) {
    throw new Error(`Only PDF (.pdf) and Image files are allowed. Received invalid format for '${fileName}'.`);
  }

  if (typeof rawData === 'string' && (rawData.startsWith('http://') || rawData.startsWith('https://'))) {
    return {
      id: `doc_${docKey}_${Date.now().toString(36)}`,
      key: docKey,
      name: fileName,
      type: fileType,
      url: rawData,
      secure_url: rawData,
      data: rawData,
      status: 'pending',
      verified: false,
      uploadedAt: new Date().toISOString(),
    };
  }

  const isPdf = isPdfDocument(fileType, fileName);
  const resource_type = isPdf ? 'auto' : 'image';
  const cleanKey = docKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uploadRes = await cloudinary.uploader.upload(rawData, {
    folder: process.env.CLOUDINARY_FOLDER || 'eldoria/staff_documents',
    resource_type,
    public_id: `${cleanKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  });

  const fileUrl = uploadRes.secure_url || uploadRes.url;
  return {
    id: `doc_${docKey}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    key: docKey,
    name: fileName,
    type: fileType,
    url: fileUrl,
    secure_url: fileUrl,
    data: fileUrl,
    public_id: uploadRes.public_id,
    status: 'pending',
    verified: false,
    uploadedAt: new Date().toISOString(),
  };
};

/**
 * Checks whether a file is a PDF document based on mimetype or filename.
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {boolean}
 */
const isPdfDocument = (mimetype = '', originalname = '') => {
  const ext = (path.extname(originalname || '') || '').toLowerCase();
  return (
    (typeof mimetype === 'string' && mimetype.toLowerCase() === 'application/pdf') ||
    ext === '.pdf'
  );
};

/**
 * Uploads a single staff document to Cloudinary (supports base64, URL, or file object).
 * @param {string|Object} fileInput
 * @param {Object} options - { docKey, name }
 * @returns {Promise<Object>} Document object
 */
const uploadStaffDocument = async (fileInput, options = {}) => {
  const fileName = (typeof fileInput === 'object' && fileInput?.name)
    ? fileInput.name
    : (options.name || `${options.docKey || 'document'}.jpg`);
  const docKey = options.docKey || (typeof fileInput === 'object' && fileInput?.key) || 'document';
  const rawData = typeof fileInput === 'string' ? fileInput : fileInput?.data || fileInput?.url || '';
  const fileType = typeof fileInput === 'object' && fileInput?.type
    ? fileInput.type
    : (isPdfDocument('', fileName) ? 'application/pdf' : 'image/jpeg');

  if (!isValidDocumentType(fileType, fileName)) {
    throw new Error(`Only PDF (.pdf) and Image files are allowed. Received invalid format for '${fileName}'.`);
  }

  if (typeof rawData === 'string' && (rawData.startsWith('http://') || rawData.startsWith('https://'))) {
    return {
      id: `doc_${docKey}_${Date.now().toString(36)}`,
      key: docKey,
      name: fileName,
      type: fileType,
      url: rawData,
      secure_url: rawData,
      data: rawData,
      status: 'pending',
      verified: false,
      uploadedAt: new Date().toISOString(),
    };
  }

  const isPdf = isPdfDocument(fileType, fileName);
  const resource_type = isPdf ? 'auto' : 'image';
  const cleanKey = docKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uploadRes = await cloudinary.uploader.upload(rawData, {
    folder: process.env.CLOUDINARY_FOLDER || 'eldoria/staff_documents',
    resource_type,
    public_id: `${cleanKey}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  });

  const fileUrl = uploadRes.secure_url || uploadRes.url;
  return {
    id: `doc_${docKey}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    key: docKey,
    name: fileName,
    type: fileType,
    url: fileUrl,
    secure_url: fileUrl,
    data: fileUrl,
    public_id: uploadRes.public_id,
    status: 'pending',
    verified: false,
    uploadedAt: new Date().toISOString(),
  };
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
      data: fileUrl,
      url: fileUrl,
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
        data: fileUrl,
        url: fileUrl,
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

/**
 * Uploads patient medical history documents (prescriptions, discharge summaries, lab reports)
 * to Cloudinary under the 'eldoria/medical_history' folder.
 * Supports multipart/form-data (req.files) and JSON/base64 arrays (req.body.files / req.body.medicalHistory).
 * @param {Object} req - Express request
 * @param {Object} options - { folder, uploadedBy }
 * @returns {Promise<Array<Object>>} Array of uploaded medical document objects
 */
const uploadMedicalFilesToCloudinary = async (req, options = {}) => {
  const folder = options.folder || 'eldoria/medical_history';
  const uploadedBy = options.uploadedBy || 'client';
  const uploadedFiles = [];

  // 1. Process files from multipart/form-data (via multer memoryStorage)
  const filesList = Array.isArray(req.files) ? req.files : [];
  for (const file of filesList) {
    const originalname = file.originalname || 'medical_document.pdf';
    const mimetype = file.mimetype || 'application/pdf';
    const parsedExt = path.extname(originalname) || '.pdf';
    const cleanBaseName = path.basename(originalname, parsedExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

    let fileUrl = '';
    let publicId = null;

    if (isCloudinaryConfigured() && file.buffer) {
      try {
        const uploadResult = await uploadToCloudinary(file.buffer, {
          folder,
          resource_type: 'auto',
          public_id: `med_${cleanBaseName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        });
        fileUrl = uploadResult.secure_url || uploadResult.url;
        publicId = uploadResult.public_id;
      } catch (err) {
        console.warn(`⚠️ Cloudinary upload failed for ${originalname}, using data URI:`, err.message);
        fileUrl = `data:${mimetype};base64,${file.buffer.toString('base64')}`;
      }
    } else if (file.buffer) {
      fileUrl = `data:${mimetype};base64,${file.buffer.toString('base64')}`;
    }

    uploadedFiles.push({
      id: `med_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      name: originalname,
      type: mimetype,
      size: file.size || 0,
      url: fileUrl,
      data: fileUrl,
      publicId,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    });
  }

  // 2. Process JSON / base64 files from req.body.files or req.body.medicalHistory
  let bodyFiles = req.body?.files || req.body?.medicalHistory;
  if (typeof bodyFiles === 'string') {
    try {
      bodyFiles = JSON.parse(bodyFiles);
    } catch (_) {}
  }

  if (Array.isArray(bodyFiles)) {
    for (const fileObj of bodyFiles) {
      if (!fileObj) continue;
      const originalname = fileObj.name || fileObj.originalname || 'medical_document.pdf';
      const mimetype = fileObj.type || fileObj.mimetype || 'application/pdf';
      const rawData = fileObj.data || fileObj.url || '';
      let fileUrl = rawData;
      let publicId = fileObj.publicId || null;
      const parsedExt = path.extname(originalname) || '.pdf';
      const cleanBaseName = path.basename(originalname, parsedExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

      // If rawData is base64 and Cloudinary is configured, upload it
      if (isCloudinaryConfigured() && typeof rawData === 'string' && rawData.startsWith('data:')) {
        try {
          const uploadRes = await cloudinary.uploader.upload(rawData, {
            folder,
            resource_type: 'auto',
            public_id: `med_${cleanBaseName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          });
          fileUrl = uploadRes.secure_url || uploadRes.url;
          publicId = uploadRes.public_id;
        } catch (err) {
          console.warn(`⚠️ Cloudinary base64 upload failed for ${originalname}:`, err.message);
        }
      }

      uploadedFiles.push({
        id: fileObj.id || `med_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
        name: originalname,
        type: mimetype,
        size: Number(fileObj.size) || 0,
        url: fileUrl,
        data: fileUrl,
        publicId,
        uploadedAt: fileObj.uploadedAt || new Date().toISOString(),
        uploadedBy: fileObj.uploadedBy || uploadedBy,
      });
    }
  }

  return uploadedFiles;
};

/**
 * Uploads visit report photos and report documents (PDFs/scans) to Cloudinary.
 * Used when staff submits a daily visit report or completes a service visit.
 * Supports multipart/form-data (req.files) and JSON/base64 arrays (req.body.photos, req.body.images, req.body.files, req.body.reportDocument).
 *
 * @param {Object} req - Express request object
 * @param {Object} options - { photoFolder, docFolder, uploadedBy }
 * @returns {Promise<{ photos: Array<Object>, files: Array<Object> }>}
 */
const uploadVisitReportFilesToCloudinary = async (req, options = {}) => {
  const photoFolder = options.photoFolder || 'eldoria/visit_reports/photos';
  const docFolder = options.docFolder || 'eldoria/visit_reports/documents';
  const uploadedBy = options.uploadedBy || 'staff';

  const photos = [];
  const files = [];

  // Helper to process a single file upload
  const processUpload = async (fileObj, isPhotoHint = false) => {
    const originalname = fileObj.originalname || fileObj.name || (isPhotoHint ? 'visit_photo.jpg' : 'visit_report.pdf');
    const mimetype = fileObj.mimetype || fileObj.type || (isPhotoHint ? 'image/jpeg' : 'application/pdf');
    const isPdf = isPdfDocument(mimetype, originalname);
    const isImage = mimetype.startsWith('image/') || (!isPdf && isPhotoHint);
    const targetFolder = isImage ? photoFolder : docFolder;
    const prefix = isImage ? 'photo' : 'report';
    const parsedExt = path.extname(originalname) || (isImage ? '.jpg' : '.pdf');
    const cleanBase = path.basename(originalname, parsedExt).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);

    let fileUrl = fileObj.data || fileObj.url || '';
    let publicId = fileObj.publicId || null;

    if (fileObj.buffer && isCloudinaryConfigured()) {
      try {
        const uploadResult = await uploadToCloudinary(fileObj.buffer, {
          folder: targetFolder,
          resource_type: isImage ? 'image' : 'auto',
          public_id: `${prefix}_${cleanBase}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        });
        fileUrl = uploadResult.secure_url || uploadResult.url;
        publicId = uploadResult.public_id;
      } catch (err) {
        console.warn(`⚠️ Cloudinary visit file upload failed for ${originalname}:`, err.message);
        fileUrl = `data:${mimetype};base64,${fileObj.buffer.toString('base64')}`;
      }
    } else if (fileObj.buffer) {
      fileUrl = `data:${mimetype};base64,${fileObj.buffer.toString('base64')}`;
    } else if (typeof fileUrl === 'string' && fileUrl.startsWith('data:') && isCloudinaryConfigured()) {
      try {
        const uploadRes = await cloudinary.uploader.upload(fileUrl, {
          folder: targetFolder,
          resource_type: isImage ? 'image' : 'auto',
          public_id: `${prefix}_${cleanBase}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        });
        fileUrl = uploadRes.secure_url || uploadRes.url;
        publicId = uploadRes.public_id;
      } catch (err) {
        console.warn(`⚠️ Cloudinary base64 upload failed for ${originalname}:`, err.message);
      }
    }

    const docRecord = {
      id: fileObj.id || `rep_${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      name: originalname,
      type: mimetype,
      size: Number(fileObj.size) || 0,
      url: fileUrl,
      data: fileUrl,
      publicId,
      uploadedAt: fileObj.uploadedAt || new Date().toISOString(),
      uploadedBy,
    };

    if (isImage) {
      photos.push(docRecord);
    } else {
      files.push(docRecord);
    }
  };

  // 1. Process multipart files (req.files)
  const reqFilesList = Array.isArray(req.files) ? req.files : [];
  for (const f of reqFilesList) {
    const fn = (f.fieldname || '').toLowerCase();
    const isPhoto = fn.includes('photo') || fn.includes('image') || fn.includes('pic') || (f.mimetype && f.mimetype.startsWith('image/'));
    await processUpload(f, isPhoto);
  }

  // 2. Process JSON / body photos (req.body.photos or req.body.images)
  let bodyPhotos = req.body?.photos || req.body?.images;
  if (typeof bodyPhotos === 'string') {
    try { bodyPhotos = JSON.parse(bodyPhotos); } catch (_) {}
  }
  if (Array.isArray(bodyPhotos)) {
    for (const p of bodyPhotos) {
      if (!p) continue;
      const pObj = typeof p === 'string' ? { url: p, data: p, name: 'photo.jpg', type: 'image/jpeg' } : p;
      await processUpload(pObj, true);
    }
  }

  // 3. Process JSON / body documents (req.body.files, req.body.documents, req.body.reportDocument)
  let bodyFiles = req.body?.files || req.body?.documents || req.body?.reportDocument;
  if (typeof bodyFiles === 'string') {
    try { bodyFiles = JSON.parse(bodyFiles); } catch (_) {}
  }
  if (Array.isArray(bodyFiles)) {
    for (const d of bodyFiles) {
      if (!d) continue;
      const dObj = typeof d === 'string' ? { url: d, data: d, name: 'report.pdf', type: 'application/pdf' } : d;
      await processUpload(dObj, false);
    }
  } else if (bodyFiles && typeof bodyFiles === 'object') {
    await processUpload(bodyFiles, false);
  }

  return { photos, files };
};

module.exports = {
  isValidDocumentType,
  isPdfDocument,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadStaffDocument,
  uploadStaffFilesToCloudinary,
  uploadMedicalFilesToCloudinary,
  uploadVisitReportFilesToCloudinary,
  getAuthenticatedDownloadUrl,
};
