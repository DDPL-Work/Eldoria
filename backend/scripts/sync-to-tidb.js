require('dotenv').config();
const { getLocalSequelize, getCloudSequelize } = require('../src/configs/db.config');
const { migrateUp } = require('../src/database/migrations/runner');
const { defineDb, smartMirrorRecord } = require('./sync-to-aiven');

const localSequelize = getLocalSequelize();
const tidbSequelize = getCloudSequelize();

async function syncToTiDB(options = {}) {
  const { isStandalone = false, silent = false } = options;
  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;

  log('🚀 Starting Data Synchronization: [Local MySQL] ➡️ [TiDB Cloud]...\n');

  try {
    await localSequelize.authenticate();
    log('✅ Connected to Local MySQL.');

    await tidbSequelize.authenticate();
    log('✅ Connected to TiDB Cloud.\n');

    log('🔄 Checking database schema & migrations on TiDB Cloud...');
    const applied = await migrateUp(tidbSequelize);
    if (applied.length > 0) {
      log(`✅ Applied ${applied.length} pending migrations on TiDB: ${applied.join(', ')}`);
    } else {
      log('✅ TiDB database schema is up-to-date.');
    }

    const localDb = defineDb(localSequelize);
    const tidbDb = defineDb(tidbSequelize);

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
      const tidbModel = tidbDb[modelName];
      if (!localModel || !tidbModel) continue;

      const records = await localModel.findAll({ raw: true });

      if (records.length === 0) {
        summary.push({ Table: modelName, 'Local Records': 0, 'Synced to TiDB': 0, Status: 'No data' });
        continue;
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await smartMirrorRecord(tidbModel, modelName, record);
          syncedCount++;
        } catch (err) {
          errorCount++;
          const details =
            err.errors && Array.isArray(err.errors)
              ? err.errors.map((e) => `${e.path || e.type}: ${e.message}`).join(', ')
              : err.message;
          warn(`   ⚠️ Error syncing ${modelName} ID ${record.id || record.staffId || record.userId || record.code}: ${details}`);
        }
      }

      summary.push({
        Table: modelName,
        'Local Records': records.length,
        'Synced to TiDB': syncedCount,
        Status: errorCount === 0 ? '✅ Complete' : `⚠️ ${errorCount} errors`,
      });
    }

    if (!silent) {
      log('\n📊 Synchronization Summary:');
      console.table(summary);
      log('\n✨ Local MySQL records have been successfully mirrored to TiDB Cloud!');
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
      await tidbSequelize.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  syncToTiDB({ isStandalone: true });
}

module.exports = {
  syncToTiDB,
};
