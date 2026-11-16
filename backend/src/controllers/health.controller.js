const { checkDatabaseHealth } = require('../services/dbHealth.service');
const { getCronStatus } = require('../services/cron.service');
const { isSentryEnabled } = require('../services/sentry.service');
const { successResponse, errorResponse } = require('../utills/responseHandler');

const getHealthStatus = async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const cronStatus = getCronStatus();

  const healthData = {
    status: dbHealth.ok ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      dialect: 'mysql',
      status: dbHealth.status,
      latencyMs: dbHealth.latencyMs || null,
      error: dbHealth.error || null,
    },
    services: {
      cron: {
        active: cronStatus.isScheduled,
        schedule: cronStatus.schedule,
        lastExecution: cronStatus.lastExecution,
      },
      sentry: {
        enabled: isSentryEnabled(),
      },
    },
    environment: process.env.NODE_ENV || 'development',
  };

  if (!dbHealth.ok) {
    return res.status(503).json({
      success: false,
      message: `Eldoria backend service is degraded: MySQL database connection is ${dbHealth.status}.`,
      data: healthData,
    });
  }

  return successResponse(res, healthData, 'Eldoria backend service is operational');
};

module.exports = {
  getHealthStatus,
};
