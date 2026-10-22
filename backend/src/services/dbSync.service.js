const { getAivenSequelize, getLocalSequelize, isLocal, isServer } = require('../configs/db.config');
const { smartMirrorRecord } = require('../../scripts/sync-to-aiven');

let targetDbInstance = null;
let isTargetAvailable = null;
let isReplicating = false;

/**
 * Initializes model definitions on the secondary/target connection.
 * If running on Local -> Target is Aiven Cloud.
 * If running on Cloud/Server -> Target is Local MySQL (if accessible).
 */
const getTargetDb = () => {
  if (targetDbInstance) return targetDbInstance;

  const targetSequelize = isLocal ? getAivenSequelize() : getLocalSequelize();
  const db = {
    sequelize: targetSequelize,
    Admin: require('../database/models/admin.model')(targetSequelize),
    User: require('../database/models/user.model')(targetSequelize),
    Staff: require('../database/models/staff.model')(targetSequelize),
    Client: require('../database/models/client.model')(targetSequelize),
    Otp: require('../database/models/otp.model')(targetSequelize),
    Booking: require('../database/models/booking.model')(targetSequelize),
    Enquiry: require('../database/models/enquiry.model')(targetSequelize),
    City: require('../database/models/city.model')(targetSequelize),
    Service: require('../database/models/service.model')(targetSequelize),
    Category: require('../database/models/category.model')(targetSequelize),
    Setting: require('../database/models/setting.model')(targetSequelize),
    NotifyMe: require('../database/models/notifyMe.model')(targetSequelize),
    InAppNotification: require('../database/models/inAppNotification.model')(targetSequelize),
  };

  // Associations for foreignKey consistency
  db.User.hasOne(db.Staff, { foreignKey: 'staffId', sourceKey: 'staffId', as: 'staffProfile', constraints: false });
  db.Staff.belongsTo(db.User, { foreignKey: 'staffId', targetKey: 'staffId', as: 'user', constraints: false });
  db.User.hasOne(db.Client, { foreignKey: 'userId', as: 'clientProfile', constraints: false });
  db.Client.belongsTo(db.User, { foreignKey: 'userId', as: 'user', constraints: false });
  db.User.hasMany(db.NotifyMe, { foreignKey: 'userId', as: 'notifyRequests', constraints: false });
  db.NotifyMe.belongsTo(db.User, { foreignKey: 'userId', as: 'user', constraints: false });
  db.User.hasMany(db.InAppNotification, { foreignKey: 'userId', as: 'inAppNotifications', constraints: false });
  db.InAppNotification.belongsTo(db.User, { foreignKey: 'userId', as: 'user', constraints: false });
  db.Booking.belongsTo(db.Staff, { foreignKey: 'staffId', targetKey: 'staffId', as: 'assignedStaff', constraints: false });
  db.Staff.hasMany(db.Booking, { foreignKey: 'staffId', sourceKey: 'staffId', as: 'bookings', constraints: false });
  db.Service.belongsTo(db.City, { foreignKey: 'cityId', as: 'primaryCity', constraints: false });
  db.City.hasMany(db.Service, { foreignKey: 'cityId', as: 'services', constraints: false });

  targetDbInstance = db;
  return targetDbInstance;
};

// Queue for asynchronous background replication
const syncQueue = [];
let isProcessingQueue = false;

const isSyncEnabled = () => {
  // Sync is enabled by default if ENABLE_AIVEN_SYNC or ENABLE_DB_SYNC is true
  const flag = process.env.ENABLE_AIVEN_SYNC || process.env.ENABLE_DB_SYNC;
  return flag === 'true';
};

const processQueue = async () => {
  if (isProcessingQueue || syncQueue.length === 0) return;
  isProcessingQueue = true;

  while (syncQueue.length > 0) {
    const task = syncQueue.shift();
    try {
      isReplicating = true;
      await executeSyncTask(task);
    } catch (err) {
      const details =
        err.errors && Array.isArray(err.errors)
          ? err.errors.map((e) => `${e.path || e.type}: ${e.message}`).join(', ')
          : err.message;
      const targetName = isLocal ? 'Aiven Cloud' : 'Local MySQL';
      console.warn(`⚠️ [DB Sync Error] Failed to mirror ${task.modelName} (${task.action}) to ${targetName}:`, details);
    } finally {
      isReplicating = false;
    }
  }

  isProcessingQueue = false;
};

const MODEL_BUSINESS_KEYS = {
  Booking: ['code'],
  Client: ['clientId'],
  Staff: ['staffId'],
  Admin: ['email'],
  Category: ['slug', 'name'],
  City: ['name'],
  Setting: ['id'],
  User: ['phone', 'email'],
  Enquiry: ['code'],
};

const executeSyncTask = async (task) => {
  const { modelName, action, data, primaryKey } = task;
  const targetDb = getTargetDb();
  const targetModel = targetDb[modelName];

  if (!targetModel) {
    console.warn(`⚠️ [DB Sync] Model '${modelName}' not found on target connection.`);
    return;
  }

  if (action === 'upsert') {
    if (Array.isArray(data)) {
      for (const item of data) {
        await smartMirrorRecord(targetModel, modelName, item);
      }
    } else {
      await smartMirrorRecord(targetModel, modelName, data);
    }
  } else if (action === 'destroy') {
    const keys = MODEL_BUSINESS_KEYS[modelName] || [];
    let whereClause = null;

    for (const key of keys) {
      if (data && data[key]) {
        whereClause = { [key]: data[key] };
        break;
      }
    }

    if (!whereClause) {
      if (primaryKey && data[primaryKey]) {
        whereClause = { [primaryKey]: data[primaryKey] };
      } else if (data.id) {
        whereClause = { id: data.id };
      }
    }

    if (whereClause) {
      await targetModel.destroy({ where: whereClause });
    } else {
      console.warn(`⚠️ [DB Sync] Missing identifier to delete from ${modelName}`);
    }
  }
};

/**
 * Enqueue a sync task to be processed asynchronously.
 */
const enqueueSync = (modelName, action, data, primaryKey) => {
  if (!isSyncEnabled() || isReplicating) {
    return;
  }

  syncQueue.push({ modelName, action, data, primaryKey });
  setImmediate(processQueue);
};

/**
 * Attaches Sequelize lifecycle hooks to replicate all database writes
 * bidirectionally between Local MySQL and Aiven Cloud.
 */
const attachAivenSyncHooks = (db) => {
  if (!isSyncEnabled()) {
    return;
  }

  const directionLabel = isLocal
    ? 'Local MySQL ➡️ Aiven Cloud'
    : 'Aiven Cloud ➡️ Local MySQL';

  console.log(`🔄 Automatic real-time background sync [${directionLabel}] enabled on all database actions.`);

  const syncableModels = [
    'Admin',
    'User',
    'Staff',
    'Client',
    'City',
    'Category',
    'Service',
    'Booking',
    'Enquiry',
    'Otp',
    'Setting',
    'NotifyMe',
    'InAppNotification',
  ];

  syncableModels.forEach((modelName) => {
    const model = db[modelName];
    if (!model) return;

    const primaryKey = model.primaryKeyAttribute || 'id';

    // Hook: After Create
    model.addHook('afterCreate', `db_sync_create_${modelName}`, (instance) => {
      if (isReplicating) return;
      enqueueSync(modelName, 'upsert', instance.toJSON(), primaryKey);
    });

    // Hook: After Update
    model.addHook('afterUpdate', `db_sync_update_${modelName}`, (instance) => {
      if (isReplicating) return;
      enqueueSync(modelName, 'upsert', instance.toJSON(), primaryKey);
    });

    // Hook: After Destroy
    model.addHook('afterDestroy', `db_sync_destroy_${modelName}`, (instance) => {
      if (isReplicating) return;
      enqueueSync(modelName, 'destroy', instance.toJSON(), primaryKey);
    });

    // Hook: After Bulk Create
    model.addHook('afterBulkCreate', `db_sync_bulk_${modelName}`, (instances) => {
      if (isReplicating) return;
      if (Array.isArray(instances) && instances.length > 0) {
        enqueueSync(
          modelName,
          'upsert',
          instances.map((i) => (typeof i.toJSON === 'function' ? i.toJSON() : i)),
          primaryKey
        );
      }
    });

    // Hook: After Upsert
    model.addHook('afterUpsert', `db_sync_upsert_${modelName}`, (values) => {
      if (isReplicating) return;
      const payload = Array.isArray(values) ? values[0] : values;
      const json = payload && typeof payload.toJSON === 'function' ? payload.toJSON() : payload;
      if (json) {
        enqueueSync(modelName, 'upsert', json, primaryKey);
      }
    });
  });
};

/**
 * Triggers a full bidirectional sync between both databases on-demand.
 */
const syncBothDatabases = async (options = {}) => {
  const { pullFromAiven } = require('../../scripts/pull-from-aiven');
  const { syncToAiven } = require('../../scripts/sync-to-aiven');

  console.log('🔄 Executing full bidirectional synchronization between Local MySQL and Aiven Cloud...');
  await pullFromAiven({ silent: options.silent || false, isStandalone: false });
  await syncToAiven({ silent: options.silent || false, isStandalone: false });
  console.log('✅ Full bidirectional synchronization completed successfully.');
};

module.exports = {
  attachAivenSyncHooks,
  attachDbSyncHooks: attachAivenSyncHooks,
  enqueueSync,
  getTargetDb,
  getAivenDb: getTargetDb,
  syncBothDatabases,
};
