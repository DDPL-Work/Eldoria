require('dotenv').config();

/**
 * Validates and retrieves the JWT Secret from environment variables.
 * Fails fast with a fatal exception if JWT_SECRET is missing or has insufficient entropy (< 32 characters).
 * Provides a dedicated test-only fallback during Jest unit test runs.
 */
const getJwtSecret = () => {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'test' ? 'test_jwt_secret_min_32_characters_key_2026' : null);

  if (!secret || secret.length < 32) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be configured with at least 32 characters in environment variables.');
  }

  return secret;
};

module.exports = {
  getJwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
};
