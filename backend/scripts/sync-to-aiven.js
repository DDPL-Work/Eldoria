require('dotenv').config();
const { getLocalSequelize, getAivenSequelize } = require('../src/configs/db.config');
const { migrateUp } = require('../src/database/migrations/runner');

const localSequelize = getLocalSequelize();
const aivenSequelize = getAivenSequelize();

// Define models on any given connection
const defineDb = (seq) => {
  return {
    Admin: require('../src/database/models/admin.model')(seq),
    City: require('../src/database/models/city.model')(seq),
    Category: require('../src/database/models/category.model')(seq),
    Setting: require('../src/database/models/setting.model')(seq),
    Service: require('../src/database/models/service.model')(seq),
    User: require('../src/database/models/user.model')(seq),
    Staff: require('../src/database/models/staff.model')(seq),
    Client: require('../src/database/models/client.model')(seq),
    Booking: require('../src/database/models/booking.model')(seq),
    Enquiry: require('../src/database/models/enquiry.model')(seq),
    Otp: require('../src/database/models/otp.model')(seq),
    NotifyMe: require('../src/database/models/notifyMe.model')(seq),
    InAppNotification: require('../src/database/models/inAppNotification.model')(seq),
  };
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

/**
 * Smartly reconciles a single record into the target database.
 * If the record already exists on the target by its unique business key,
 * it updates that record on the target, preserving the target's primary key ID.
 * If it doesn't exist, it checks if the source ID is free on the target:
 * if free, it keeps the ID; if occupied, it creates with a new target auto-increment ID.
 */
async function smartMirrorRecord(targetModel, modelName, record) {
  // Defensive sanitization
  if (modelName === 'City' && (record.order === null || record.order === undefined)) {
    record.order = 99;
  }

  const keys = MODEL_BUSINESS_KEYS[modelName] || [];
  let existing = null;

  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      try {
        existing = await targetModel.findOne({ where: { [key]: record[key] } });
        if (existing) break;
      } catch (_) {}
    }
  }

  const primaryKey = targetModel.primaryKeyAttribute || 'id';

  if (!existing && record[primaryKey]) {
    try {
      existing = await targetModel.findByPk(record[primaryKey]);
    } catch (_) {}
  }

  if (existing) {
    const payload = { ...record };
    delete payload[primaryKey];
    await existing.update(payload);
    return { action: 'updated', id: existing[primaryKey] };
  } else {
    if (record[primaryKey]) {
      const conflict = await targetModel.findByPk(record[primaryKey]);
      if (conflict) {
        const payload = { ...record };
        delete payload[primaryKey];
        const created = await targetModel.create(payload);
        return { action: 'created_new_id', id: created[primaryKey] };
      }
    }
    await targetModel.upsert(record);
    return { action: 'created', id: record[primaryKey] };
  }
}

async function syncToAiven(options = {}) {
  const { isStandalone = false, silent = false } = options;
  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;

  log('🚀 Starting Data Synchronization: [Local MySQL] ➡️ [Aiven Cloud]...\n');

  try {
    await localSequelize.authenticate();
    log('✅ Connected to Local MySQL.');

    await aivenSequelize.authenticate();
    log('✅ Connected to Aiven MySQL Cloud.\n');

    log('🔄 Checking database schema & migrations on Aiven Cloud...');
    const applied = await migrateUp(aivenSequelize);
    if (applied.length > 0) {
      log(`✅ Applied ${applied.length} pending migrations on Aiven: ${applied.join(', ')}`);
    } else {
      log('✅ Aiven database schema is up-to-date.');
    }

    const localDb = defineDb(localSequelize);
    const aivenDb = defineDb(aivenSequelize);

    const syncPlan = [
      'Admin',
      'City',
      'Category',
      'Setting',
      'Service',
      'User',
      'Staff',
      'Client',
      'Booking',
      'Enquiry',
      'Otp',
      'NotifyMe',
      'InAppNotification',
    ];

    log('\n📦 Synchronizing table records...');
    const summary = [];

    for (const modelName of syncPlan) {
      const localModel = localDb[modelName];
      const aivenModel = aivenDb[modelName];
      if (!localModel || !aivenModel) continue;

      const records = await localModel.findAll({ raw: true });

      if (records.length === 0) {
        summary.push({ Table: modelName, 'Local Records': 0, 'Synced to Aiven': 0, Status: 'No data' });
        continue;
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await smartMirrorRecord(aivenModel, modelName, record);
          syncedCount++;
        } catch (err) {
          errorCount++;
          const details =
            err.errors && Array.isArray(err.errors)
              ? err.errors.map((e) => `${e.path || e.type}: ${e.message}`).join(', ')
              : err.message;
          warn(`   ⚠️ Error syncing ${modelName} ID ${record.id || record.staffId || record.userId}: ${details}`);
        }
      }

      summary.push({
        Table: modelName,
        'Local Records': records.length,
        'Synced to Aiven': syncedCount,
        Status: errorCount === 0 ? '✅ Complete' : `⚠️ ${errorCount} errors`,
      });
    }

    if (!silent) {
      log('\n📊 Synchronization Summary:');
      console.table(summary);
      log('\n✨ Local records have been successfully mirrored to Aiven Cloud MySQL!');
    }

    return { success: true, summary };
  } catch (error) {
    console.error('\n❌ Synchronization failed:', error.message);
    if (isStandalone) {
      process.exit(1);
    }
    throw error;
  } finally {
    if (isStandalone) {
      await localSequelize.close().catch(() => {});
      await aivenSequelize.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  syncToAiven({ isStandalone: true });
}

module.exports = {
  syncToAiven,
  defineDb,
  smartMirrorRecord,
};
