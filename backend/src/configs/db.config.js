const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Determine if running against Server (Aiven) or Local MySQL
const dbEnv = (process.env.DB_ENV || '').toLowerCase().trim();
const isServer = dbEnv === 'server' || dbEnv === 'aiven' || (process.env.NODE_ENV === 'production' && !dbEnv);
const isLocal = !isServer;

// Certificate path for Aiven SSL
const CA_CERT_PATH = path.join(__dirname, '..', 'certificates', 'aiven-ca.pem');

// Helper to get SSL options for Aiven
const getAivenSslOptions = () => {
  try {
    if (fs.existsSync(CA_CERT_PATH)) {
      return {
        ssl: {
          ca: fs.readFileSync(CA_CERT_PATH, 'utf8'),
          rejectUnauthorized: true,
        },
      };
    }
  } catch (err) {
    console.warn('⚠️ Could not load Aiven CA certificate:', err.message);
  }
  return {};
};

// 1. Local MySQL configuration
const localConfig = {
  database: process.env.LOCAL_DB_NAME || process.env.DB_NAME || 'eldorio',
  username: process.env.LOCAL_DB_USER || process.env.DB_USER || 'root',
  password:
    process.env.LOCAL_DB_PASSWORD !== undefined
      ? process.env.LOCAL_DB_PASSWORD
      : process.env.DB_PASSWORD || '',
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: Number(process.env.LOCAL_DB_PORT || 3306),
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? false : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { timestamps: true, status: true },
};

// 2. Aiven MySQL configuration
const aivenConfig = {
  database: process.env.AIVEN_DB_NAME || process.env.DB_NAME || 'defaultdb',
  username: process.env.AIVEN_DB_USER || process.env.DB_USER || 'avnadmin',
  password:
    process.env.AIVEN_DB_PASSWORD !== undefined
      ? process.env.AIVEN_DB_PASSWORD
      : process.env.DB_PASSWORD || '',
  host: process.env.AIVEN_DB_HOST || 'mysql-14fd1d35-eldorio.f.aivencloud.com',
  port: Number(process.env.AIVEN_DB_PORT || 11122),
  dialect: 'mysql',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { timestamps: true, status: true },
  dialectOptions: getAivenSslOptions(),
};

// Primary active connection configuration
const activeConfig = isServer ? aivenConfig : localConfig;

console.log(
  `📦 Database Mode: ${isServer ? '☁️ AIVEN (Server)' : '💻 LOCAL (Local MySQL)'} [DB_ENV=${process.env.DB_ENV || (isServer ? 'server' : 'local')}]`
);

const sequelize = new Sequelize(
  activeConfig.database,
  activeConfig.username,
  activeConfig.password,
  activeConfig
);

// Singletons for secondary instances
let _aivenInstance = null;
let _localInstance = null;

const getAivenSequelize = () => {
  if (isServer) return sequelize;
  if (!_aivenInstance) {
    _aivenInstance = new Sequelize(
      aivenConfig.database,
      aivenConfig.username,
      aivenConfig.password,
      aivenConfig
    );
  }
  return _aivenInstance;
};

const getLocalSequelize = () => {
  if (isLocal) return sequelize;
  if (!_localInstance) {
    _localInstance = new Sequelize(
      localConfig.database,
      localConfig.username,
      localConfig.password,
      localConfig
    );
  }
  return _localInstance;
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      `✅ Connected to ${isServer ? 'Aiven Cloud' : 'Local'} MySQL successfully.`
    );
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  connectDB,
  isServer,
  isLocal,
  localConfig,
  aivenConfig,
  getAivenSequelize,
  getLocalSequelize,
};
