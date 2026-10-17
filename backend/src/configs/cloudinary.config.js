require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
});

/**
 * Checks whether Cloudinary credentials have been provided in environment variables.
 * @returns {boolean}
 */
const isCloudinaryConfigured = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  return Boolean(
    (cloud_name && api_key && api_secret) ||
    process.env.CLOUDINARY_URL
  );
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured
};
