const { errorResponse } = require('../utills/responseHandler');
const logger = require('../utills/logger');
const { captureException, isSentryEnabled } = require('../services/sentry.service');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  // Log structured error telemetry
  if (statusCode >= 500) {
    logger.error(`[Error] ${req.method} ${req.originalUrl}: ${message}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      ip: req.ip,
      userId: req.user?.id || null,
      role: req.user?.role || null,
      stack: err.stack,
      error: err.message,
    });
  } else {
    logger.warn(`[Client ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  // Forward internal server errors (5xx) to Sentry
  if (statusCode >= 500 && isSentryEnabled()) {
    captureException(err, {
      tags: {
        path: req.path,
        method: req.method,
        statusCode: String(statusCode),
      },
      user: req.user ? { id: req.user.id, role: req.user.role, email: req.user.email } : undefined,
      extra: {
        query: req.query,
        ip: req.ip,
      },
    });
  }

  return errorResponse(res, message, statusCode, err);
};

/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
