const cron = require("node-cron");
const { checkAndMarkDateExceededBookings } = require("./bookingExpiry.service");
const logger = require("../utills/logger");
const { captureException } = require("./sentry.service");

let expiryCronTask = null;
let isTaskRunning = false;
let lastExecutionResult = null;

// Cron Expression: 00:01 AM every day (Asia/Kolkata)
const DEFAULT_CRON_EXPRESSION = "1 0 * * *";
const CRON_TIMEZONE = "Asia/Kolkata";

/**
 * Executes the booking expiry check and transition to 'date_exceeded'.
 * Guaranteed concurrency protection: if a run is already active, subsequent triggers wait or skip.
 *
 * @param {string} [source="cron_midnight"] - Identifier for who triggered the check
 * @param {Object} [options={}] - Optional filters (e.g. city)
 * @returns {Promise<{ success: boolean, updatedCount: number, updatedBookings: Array, durationMs: number }>}
 */
const runBookingExpiryJob = async (source = "cron_midnight", options = {}) => {
  if (isTaskRunning) {
    logger.warn(`⏳ [Cron] Expiry check already in progress. Skipping trigger from '${source}'.`);
    return {
      success: true,
      skipped: true,
      reason: "already_running",
      updatedCount: 0,
      updatedBookings: [],
    };
  }

  isTaskRunning = true;
  const startTime = Date.now();
  logger.info(`🔄 [Cron] Running overdue booking check & transition (Trigger: ${source})...`);

  try {
    const result = await checkAndMarkDateExceededBookings(options);
    const durationMs = Date.now() - startTime;

    lastExecutionResult = {
      timestamp: new Date().toISOString(),
      source,
      durationMs,
      updatedCount: result.updatedCount,
      success: true,
    };

    if (result.updatedCount > 0) {
      logger.info(
        `✅ [Cron] Overdue booking check completed in ${durationMs}ms: ${result.updatedCount} booking(s) transitioned to 'date_exceeded'.`,
        {
          source,
          updatedCount: result.updatedCount,
          bookingCodes: result.updatedBookings.map((b) => b.code),
        }
      );
    } else {
      logger.info(`✨ [Cron] Overdue booking check completed in ${durationMs}ms: No overdue bookings found.`);
    }

    return {
      success: true,
      durationMs,
      updatedCount: result.updatedCount,
      updatedBookings: result.updatedBookings,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    lastExecutionResult = {
      timestamp: new Date().toISOString(),
      source,
      durationMs,
      error: error.message,
      success: false,
    };

    logger.error(`❌ [Cron] Error during overdue booking check: ${error.message}`, {
      source,
      durationMs,
      error: error.message,
      stack: error.stack,
    });

    captureException(error, {
      tags: { job: "booking_expiry_cron", source },
      extra: { options, durationMs },
    });

    throw error;
  } finally {
    isTaskRunning = false;
  }
};

/**
 * Initializes and starts the scheduled midnight cron task.
 * Skips starting in test mode unless ENABLE_CRON_IN_TEST is truthy.
 */
const startExpiryCron = () => {
  if (process.env.NODE_ENV === "test" && !process.env.ENABLE_CRON_IN_TEST) {
    return null;
  }

  if (process.env.ENABLE_EXPIRY_CRON === "false") {
    logger.info("ℹ️ [Cron] Midnight booking expiry cron is disabled via ENABLE_EXPIRY_CRON=false.");
    return null;
  }

  if (expiryCronTask) {
    return expiryCronTask;
  }

  const cronExpression = process.env.EXPIRY_CRON_SCHEDULE || DEFAULT_CRON_EXPRESSION;

  logger.info(`⏰ [Cron] Scheduling booking expiry cron job [Schedule: "${cronExpression}" | Timezone: ${CRON_TIMEZONE}].`);

  expiryCronTask = cron.schedule(
    cronExpression,
    async () => {
      await runBookingExpiryJob("scheduled_midnight").catch((err) => {
        logger.error(`[Cron] Scheduled execution failed: ${err.message}`);
      });
    },
    {
      timezone: CRON_TIMEZONE,
    }
  );

  // Run a quick scan on startup (delayed by 5s to allow DB connection and migrations to complete)
  if (process.env.RUN_CRON_ON_STARTUP !== "false") {
    const startupTimer = setTimeout(async () => {
      logger.info("🚀 [Cron] Running initial startup check for overdue bookings...");
      await runBookingExpiryJob("startup_scan").catch((err) => {
        logger.warn(`[Cron] Startup scan note: ${err.message}`);
      });
    }, 5000);

    if (startupTimer.unref) startupTimer.unref();
  }

  return expiryCronTask;
};

/**
 * Stops the scheduled cron task during graceful shutdown.
 */
const stopExpiryCron = () => {
  if (expiryCronTask) {
    expiryCronTask.stop();
    expiryCronTask = null;
    logger.info("🛑 [Cron] Booking expiry cron task stopped.");
  }
};

/**
 * Gets telemetry about the latest cron execution and task status.
 */
const getCronStatus = () => ({
  isRunning: isTaskRunning,
  isScheduled: Boolean(expiryCronTask),
  schedule: process.env.EXPIRY_CRON_SCHEDULE || DEFAULT_CRON_EXPRESSION,
  timezone: CRON_TIMEZONE,
  lastExecution: lastExecutionResult,
});

module.exports = {
  runBookingExpiryJob,
  startExpiryCron,
  stopExpiryCron,
  getCronStatus,
};
