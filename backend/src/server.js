require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize, syncDatabase } = require('./database/models');
const logger = require('./utills/logger');
const { captureException } = require('./services/sentry.service');
const { startDatabaseHealthMonitor, stopDatabaseHealthMonitor } = require('./services/dbHealth.service');
const { startExpiryCron, stopExpiryCron } = require('./services/cron.service');

const PORT = process.env.PORT || 5000;

// Catch unhandled Promise rejections and uncaught exceptions globally
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error(`💥 Unhandled Promise Rejection: ${err.message}`, {
    stack: err.stack,
  });
  captureException(err, { tags: { mechanism: 'unhandledRejection' } });
});

process.on('uncaughtException', (error) => {
  logger.error(`💥 Uncaught Exception: ${error.message}`, {
    stack: error.stack,
  });
  captureException(error, { tags: { mechanism: 'uncaughtException' } });
});

const startServer = async () => {
  try {
    logger.info('🔄 Initializing Eldoria Backend Server...');

    // Attempt database connection & synchronization
    try {
      await sequelize.authenticate();
      logger.info('✅ MySQL Database connected successfully.');

      // Synchronize database models and migrations
      await syncDatabase();
    } catch (dbError) {
      logger.error('⚠️ Database connection note: Could not connect to MySQL server.', {
        error: dbError.message,
        stack: dbError.stack,
      });
      captureException(dbError, {
        tags: { alert: 'db_bootstrap_failure' },
      });
      console.warn('   Ensure MySQL is running and database credentials in .env are correct.');
    }

    // Start HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`🚀 Server is running on http://localhost:${PORT}`);
      logger.info(`🩺 Health check available at: http://localhost:${PORT}/api/health`);

      // Initialize background heartbeat and midnight cron jobs
      startDatabaseHealthMonitor();
      startExpiryCron();
    });

    // Graceful shutdown
    const handleShutdown = async (signal) => {
      logger.info(`🛑 Received ${signal}. Gracefully shutting down...`);

      // 1. Stop background scheduled tasks
      stopExpiryCron();
      stopDatabaseHealthMonitor();

      // 2. Close HTTP server and database pool
      server.close(async () => {
        try {
          await sequelize.close();
          logger.info('🔒 Database connection closed.');
        } catch (err) {
          logger.error(`Error closing database connection: ${err.message}`);
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (err) {
    logger.error('💥 Critical error during server bootstrap:', {
      error: err.message,
      stack: err.stack,
    });
    captureException(err, { tags: { alert: 'bootstrap_fatal' } });
    process.exit(1);
  }
};

startServer();

