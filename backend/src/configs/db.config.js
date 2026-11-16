const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Determine if running against Server (TiDB / Cloud) or Local MySQL
const dbEnv = (process.env.DB_ENV || '').toLowerCase().trim();
const isServer = dbEnv === 'server' || dbEnv === 'tidb' || dbEnv === 'aiven' || (process.env.NODE_ENV === 'production' && !dbEnv);
const isLocal = !isServer;
const isTiDB = Boolean(process.env.TIDB_HOST || dbEnv === 'tidb');

// Certificate path for Aiven SSL
const CA_CERT_PATH = path.join(__dirname, '..', 'certificates', 'aiven-ca.pem');

// Helper to get SSL options for Cloud (TiDB / Aiven / Generic)
const getCloudSslOptions = () => {
  // TiDB Cloud uses public trusted CAs (DigiCert / Let's Encrypt), validated natively by Node
  if (isTiDB || process.env.TIDB_SSL === 'true') {
    return {
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
    };
  }

  // Aiven custom CA fallback
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
    console.warn('⚠️ Could not load CA certificate:', err.message);
  }

  if (process.env.AIVEN_DB_SSL === 'true' || process.env.DB_SSL === 'true') {
    return {
      ssl: {
        rejectUnauthorized: false,
      },
    };
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

// 2. Cloud MySQL (TiDB / Remote) configuration
const cloudConfig = {
  database:
    process.env.TIDB_NAME ||
    process.env.DB_DATABASE ||
    process.env.AIVEN_DB_NAME ||
    process.env.DB_NAME ||
    'test',
  username:
    process.env.TIDB_USER ||
    process.env.DB_USERNAME ||
    process.env.AIVEN_DB_USER ||
    process.env.DB_USER ||
    'root',
  password:
    process.env.TIDB_PASSWORD !== undefined
      ? process.env.TIDB_PASSWORD
      : process.env.DB_PASSWORD !== undefined
      ? process.env.DB_PASSWORD
      : process.env.AIVEN_DB_PASSWORD !== undefined
      ? process.env.AIVEN_DB_PASSWORD
      : '',
  host:
    process.env.TIDB_HOST ||
    process.env.DB_HOST ||
    process.env.AIVEN_DB_HOST ||
    'localhost',
  port: Number(
    process.env.TIDB_PORT ||
    process.env.DB_PORT ||
    process.env.AIVEN_DB_PORT ||
    (isTiDB ? 4000 : 3306)
  ),
  dialect: 'mysql',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { timestamps: true, status: true },
  dialectOptions: getCloudSslOptions(),
};

// Primary active connection configuration
const activeConfig = isServer ? cloudConfig : localConfig;

const cloudLabel = isTiDB ? '☁️ TiDB Cloud' : '☁️ Cloud Server';
console.log(
  `📦 Database Mode: ${isServer ? cloudLabel : '💻 LOCAL (Local MySQL)'} [DB_ENV=${process.env.DB_ENV || (isServer ? 'server' : 'local')}]`
);

const sequelize = new Sequelize(
  activeConfig.database,
  activeConfig.username,
  activeConfig.password,
  activeConfig
);

// Singletons for secondary instances
let _cloudInstance = null;
let _localInstance = null;

const getCloudSequelize = () => {
  if (isServer) return sequelize;
  if (!_cloudInstance) {
    _cloudInstance = new Sequelize(
      cloudConfig.database,
      cloudConfig.username,
      cloudConfig.password,
      cloudConfig
    );
  }
  return _cloudInstance;
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
      `✅ Connected to ${isServer ? (isTiDB ? 'TiDB Cloud' : 'Cloud Server') : 'Local'} MySQL successfully.`
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
  isTiDB,
  localConfig,
  cloudConfig,
  aivenConfig: cloudConfig,
  getCloudSequelize,
  getAivenSequelize: getCloudSequelize,
  getLocalSequelize,
};
