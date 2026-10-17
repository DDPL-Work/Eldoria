const { getAivenSequelize, isLocal } = require('../configs/db.config');

let aivenDbInstance = null;
let isAivenConnected = null;

/**
 * Initializes the model definitions on the Aiven Sequelize connection.
 */
const getAivenDb = () => {
  if (aivenDbInstance) return aivenDbInstance;

  const aivenSequelize = getAivenSequelize();
  const db = {
    sequelize: aivenSequelize,
    Admin: require('../database/models/admin.model')(aivenSequelize),
    User: require('../database/models/user.model')(aivenSequelize),
    Staff: require('../database/models/staff.model')(aivenSequelize),
    Client: require('../database/models/client.model')(aivenSequelize),
    Otp: require('../database/models/otp.model')(aivenSequelize),
    Booking: require('../database/models/booking.model')(aivenSequelize),
    Enquiry: require('../database/models/enquiry.model')(aivenSequelize),
    City: require('../database/models/city.model')(aivenSequelize),
    Service: require('../database/models/service.model')(aivenSequelize),
    Category: require('../database/models/category.model')(aivenSequelize),
    Setting: require('../database/models/setting.model')(aivenSequelize),
  };

  // Associations
  db.User.hasOne(db.Staff, { foreignKey: 'staffId', sourceKey: 'staffId', as: 'staffProfile', constraints: false });
  db.Staff.belongsTo(db.User, { foreignKey: 'staffId', targetKey: 'staffId', as: 'user', constraints: false });
  db.User.hasOne(db.Client, { foreignKey: 'userId', as: 'clientProfile', constraints: false });
  db.Client.belongsTo(db.User, { foreignKey: 'userId', as: 'user', constraints: false });
  db.Booking.belongsTo(db.Staff, { foreignKey: 'staffId', targetKey: 'staffId', as: 'assignedStaff', constraints: false });
  db.Staff.hasMany(db.Booking, { foreignKey: 'staffId', sourceKey: 'staffId', as: 'bookings', constraints: false });

  aivenDbInstance = db;
  return aivenDbInstance;
};

// Queue for asynchronous background replication
const syncQueue = [];
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue || syncQueue.length === 0) return;
  isProcessingQueue = true;

  while (syncQueue.length > 0) {
    const task = syncQueue.shift();
    try {
      await executeSyncTask(task);
    } catch (err) {
      console.warn(`⚠️ [Aiven Sync Error] Failed to mirror ${task.modelName} (${task.action}):`, err.message);
    }
  }

  isProcessingQueue = false;
};

const executeSyncTask = async (task) => {
  const { modelName, action, data, primaryKey } = task;
  const aivenDb = getAivenDb();
  const targetModel = aivenDb[modelName];

  if (!targetModel) {
    console.warn(`⚠️ [Aiven Sync] Model '${modelName}' not found on Aiven.`);
    return;
  }

  if (action === 'upsert') {
    if (Array.isArray(data)) {
      for (const item of data) {
        await targetModel.upsert(item);
      }
    } else {
      await targetModel.upsert(data);
    }
  } else if (action === 'destroy') {
    const whereClause = {};
    if (primaryKey && data[primaryKey]) {
      whereClause[primaryKey] = data[primaryKey];
    } else if (data.id) {
      whereClause.id = data.id;
    } else {
      console.warn(`⚠️ [Aiven Sync] Missing primary key identifier to delete from ${modelName}`);
      return;
    }
    await targetModel.destroy({ where: whereClause });
  }
};

/**
 * Enqueue a sync task to be processed asynchronously.
 */
const enqueueSync = (modelName, action, data, primaryKey) => {
  if (!isLocal || process.env.ENABLE_AIVEN_SYNC !== 'true') {
    return;
  }

  syncQueue.push({ modelName, action, data, primaryKey });
  setImmediate(processQueue);
};

/**
 * Attaches Sequelize lifecycle hooks to replicate all database writes from Local to Aiven.
 */
const attachAivenSyncHooks = (db) => {
  if (!isLocal || process.env.ENABLE_AIVEN_SYNC !== 'true') {
    return;
  }

  console.log('🔄 Automatic real-time background sync from Local MySQL to Aiven enabled.');

  const syncableModels = [
    'Admin',
    'User',
    'Staff',
    'Client',
    'City',
    'Service',
    'Booking',
    'Enquiry',
    'Otp',
    'Category',
    'Setting',
  ];

  syncableModels.forEach((modelName) => {
    const model = db[modelName];
    if (!model) return;

    const primaryKey = model.primaryKeyAttribute || 'id';

    // Hook: After Create
    model.addHook('afterCreate', `aiven_sync_create_${modelName}`, (instance) => {
      enqueueSync(modelName, 'upsert', instance.toJSON(), primaryKey);
    });

    // Hook: After Update
    model.addHook('afterUpdate', `aiven_sync_update_${modelName}`, (instance) => {
      enqueueSync(modelName, 'upsert', instance.toJSON(), primaryKey);
    });

    // Hook: After Destroy
    model.addHook('afterDestroy', `aiven_sync_destroy_${modelName}`, (instance) => {
      enqueueSync(modelName, 'destroy', instance.toJSON(), primaryKey);
    });

    // Hook: After Bulk Create
    model.addHook('afterBulkCreate', `aiven_sync_bulk_${modelName}`, (instances) => {
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
    model.addHook('afterUpsert', `aiven_sync_upsert_${modelName}`, (values) => {
      const payload = Array.isArray(values) ? values[0] : values;
      const json = payload && typeof payload.toJSON === 'function' ? payload.toJSON() : payload;
      if (json) {
        enqueueSync(modelName, 'upsert', json, primaryKey);
      }
    });
  });
};

module.exports = {
  attachAivenSyncHooks,
  enqueueSync,
  getAivenDb,
};
