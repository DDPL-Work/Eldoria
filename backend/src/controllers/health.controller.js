const { sequelize } = require('../configs/db.config');
const { successResponse, errorResponse } = require('../utills/responseHandler');

const getHealthStatus = async (req, res) => {
  let dbStatus = 'disconnected';

  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `disconnected (${err.message})`;
  }

  const healthData = {
    status: 'online',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.processUptime ? process.uptime() : process.uptime()),
    database: {
      dialect: 'mysql',
      status: dbStatus
    },
    environment: process.env.NODE_ENV || 'development'
  };

  return successResponse(res, healthData, 'Eldoria backend service is operational');
};

module.exports = {
  getHealthStatus
};
