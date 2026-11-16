const winston = require("winston");
const { captureException, isSentryEnabled } = require("../services/sentry.service");

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// Custom format for readable development output
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      // Remove symbols or internal winston keys
      const cleanMeta = { ...meta };
      delete cleanMeta[Symbol.for("level")];
      delete cleanMeta[Symbol.for("message")];
      delete cleanMeta[Symbol.for("splat")];
      if (Object.keys(cleanMeta).length > 0) {
        metaStr = `\n${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Standard JSON format for cloud production logging (e.g. Render, AWS, GCP, Datadog)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: isProduction ? prodFormat : devFormat,
    silent: isTest && !process.env.ENABLE_LOGGING_IN_TEST,
  }),
];

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  format: isProduction ? prodFormat : devFormat,
  transports,
  exitOnError: false,
});

/**
 * Standard Structured Logger wrapper
 * Enriches error logging with automatic Sentry forwarding when active
 */
const logger = {
  info: (message, meta = {}) => {
    winstonLogger.info(message, meta);
  },

  warn: (message, meta = {}) => {
    winstonLogger.warn(message, meta);
  },

  error: (message, meta = {}) => {
    winstonLogger.error(message, meta);

    // If Sentry is enabled, forward error automatically
    if (isSentryEnabled()) {
      let errToCapture = null;
      if (message instanceof Error) {
        errToCapture = message;
      } else if (meta instanceof Error) {
        errToCapture = meta;
      } else if (meta && meta.error instanceof Error) {
        errToCapture = meta.error;
      } else if (meta && meta.stack) {
        errToCapture = new Error(typeof message === "string" ? message : "Logged Error");
        errToCapture.stack = meta.stack;
      } else {
        errToCapture = new Error(typeof message === "string" ? message : JSON.stringify(message));
      }

      captureException(errToCapture, {
        extra: typeof meta === "object" && meta !== null ? meta : { detail: meta },
      });
    }
  },

  http: (message, meta = {}) => {
    winstonLogger.http(message, meta);
  },

  debug: (message, meta = {}) => {
    winstonLogger.debug(message, meta);
  },

  // Raw winston instance access if needed
  raw: winstonLogger,
};

module.exports = logger;
