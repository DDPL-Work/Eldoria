const Sentry = require("@sentry/node");

let isInitialized = false;

/**
 * Initializes Sentry Error Tracking if SENTRY_DSN is configured.
 * Safely skips initialization in test mode unless explicitly requested.
 */
const initSentry = (app = null) => {
  const dsn = (process.env.SENTRY_DSN || "").trim();

  if (!dsn || dsn === "none" || dsn === "false") {
    // Sentry not configured - operates in safe disabled mode
    return false;
  }

  if (process.env.NODE_ENV === "test" && !process.env.ENABLE_SENTRY_IN_TEST) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
      serverName: process.env.SERVER_NAME || "eldoria-backend",
      integrations: [],
    });

    isInitialized = true;
    console.log("🛡️  Sentry Error Tracking initialized successfully.");

    if (app && typeof Sentry.setupExpressErrorHandler === "function") {
      Sentry.setupExpressErrorHandler(app);
    }

    return true;
  } catch (err) {
    console.warn("⚠️ Failed to initialize Sentry:", err.message);
    isInitialized = false;
    return false;
  }
};

/**
 * Checks whether Sentry is currently active and ready to capture events.
 */
const isSentryEnabled = () => isInitialized;

/**
 * Captures an exception and sends it to Sentry with optional structured context.
 *
 * @param {Error|any} error - The error object to capture
 * @param {Object} [context] - Contextual metadata (tags, extra, user)
 */
const captureException = (error, context = {}) => {
  if (!isInitialized) return null;

  try {
    return Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || context,
      user: context.user || undefined,
    });
  } catch (err) {
    console.warn("⚠️ Sentry captureException error:", err.message);
    return null;
  }
};

/**
 * Captures an informational or warning message to Sentry.
 *
 * @param {string} message
 * @param {"fatal"|"error"|"warning"|"log"|"info"|"debug"} [level="info"]
 * @param {Object} [context]
 */
const captureMessage = (message, level = "info", context = {}) => {
  if (!isInitialized) return null;

  try {
    return Sentry.captureMessage(message, {
      level,
      tags: context.tags || {},
      extra: context.extra || context,
    });
  } catch (err) {
    console.warn("⚠️ Sentry captureMessage error:", err.message);
    return null;
  }
};

module.exports = {
  Sentry,
  initSentry,
  isSentryEnabled,
  captureException,
  captureMessage,
};
