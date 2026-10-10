require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize, syncDatabase } = require('./database/models');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🔄 Initializing Eldoria Backend Server...');

    // Attempt database connection & synchronization
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL Database connected successfully.');
      
      // Synchronize database models and migrations
      await syncDatabase();
    } catch (dbError) {
      console.warn('⚠️  Database connection note: Could not connect to MySQL server.');
      console.warn(`   Detail: ${dbError.message}`);
      console.warn('   Ensure MySQL is running and database credentials in .env are correct.');
    }

    // Start HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const handleShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        try {
          await sequelize.close();
          console.log('🔒 Database connection closed.');
        } catch (err) {
          console.error('Error closing database connection:', err.message);
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (err) {
    console.error('💥 Critical error during server bootstrap:', err);
    process.exit(1);
  }
};

startServer();
