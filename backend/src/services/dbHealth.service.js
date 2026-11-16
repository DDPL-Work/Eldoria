const { sequelize } = require("../configs/db.config");
const logger = require("../utills/logger");
const { captureException } = require("./sentry.service");

let isDbConnected = false;
let monitorIntervalId = null;
let lastCheckTimestamp = null;
let consecutiveFailures = 0;

/**
 * Actively pings the database connection via authenticate().
 * Reports latency, tracks state changes, and alerts Sentry on connection drops.
 *
 * @returns {Promise<{ ok: boolean, status: string, latencyMs?: number, error?: string }>}
 */
const checkDatabaseHealth = async () => {
  const start = Date.now();
  lastCheckTimestamp = new Date().toISOString();

  try {
    await sequelize.authenticate();
    const latencyMs = Date.now() - start;

    if (!isDbConnected) {
      if (consecutiveFailures > 0) {
        logger.info(`✅ [Database Health] MySQL connection restored after ${consecutiveFailures} failed attempts (${latencyMs}ms).`);
      }
      isDbConnected = true;
      consecutiveFailures = 0;
    }

    return {
      ok: true,
      status: "connected",
      latencyMs,
      timestamp: lastCheckTimestamp,
    };
  } catch (err) {
    const wasConnected = isDbConnected;
    isDbConnected = false;
    consecutiveFailures += 1;

    const errorDetails = {
      status: "disconnected",
      consecutiveFailures,
      error: err.message,
      timestamp: lastCheckTimestamp,
    };

    // Alert on connection drop or ongoing failure
    logger.error(`❌ [Database Health] Database connection failure (Attempt #${consecutiveFailures}): ${err.message}`, errorDetails);

    // Send high-priority alert to Sentry on first disconnect or repeated drop
    captureException(err, {
      tags: {
        alert: "database_disconnected",
        component: "mysql",
        wasPreviouslyConnected: String(wasConnected),
      },
      extra: errorDetails,
    });

    return {
      ok: false,
      status: "disconnected",
      consecutiveFailures,
      error: err.message,
      timestamp: lastCheckTimestamp,
    };
  }
};

/**
 * Returns current cached connection status without making a network call.
 */
const getCachedDbStatus = () => ({
  isConnected: isDbConnected,
  consecutiveFailures,
  lastCheck: lastCheckTimestamp,
});

/**
 * Starts a background heartbeat that periodically checks database connectivity.
 *
 * @param {number} [intervalMs=60000] - Interval between health checks in milliseconds
 */
const startDatabaseHealthMonitor = (intervalMs = 60000) => {
  if (process.env.NODE_ENV === "test" && !process.env.ENABLE_DB_MONITOR_IN_TEST) {
    return null;
  }

  if (monitorIntervalId) {
    return monitorIntervalId;
  }

  const parsedInterval = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL_MS || intervalMs, 10) || 60000;

  logger.info(`🩺 [Database Health Monitor] Active. Pinging database every ${parsedInterval / 1000}s.`);

  monitorIntervalId = setInterval(async () => {
    await checkDatabaseHealth().catch((err) => {
      logger.error(`[Database Health Monitor] Unhandled check error: ${err.message}`);
    });
  }, parsedInterval);

  // Unref timer so it does not keep Node.js event loop alive during shutdown or CLI commands
  if (monitorIntervalId.unref) {
    monitorIntervalId.unref();
  }

  return monitorIntervalId;
};

/**
 * Stops the background database health monitor timer.
 */
const stopDatabaseHealthMonitor = () => {
  if (monitorIntervalId) {
    clearInterval(monitorIntervalId);
    monitorIntervalId = null;
    logger.info("🛑 [Database Health Monitor] Stopped.");
  }
};

module.exports = {
  checkDatabaseHealth,
  getCachedDbStatus,
  startDatabaseHealthMonitor,
  stopDatabaseHealthMonitor,
};
