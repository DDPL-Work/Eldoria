require('dotenv').config();
const { getLocalSequelize, getCloudSequelize } = require('../src/configs/db.config');
const { migrateUp } = require('../src/database/migrations/runner');
const { defineDb, smartMirrorRecord } = require('./sync-to-aiven');

const localSequelize = getLocalSequelize();
const tidbSequelize = getCloudSequelize();

async function pullFromTiDB(options = {}) {
  const { isStandalone = false, silent = false } = options;
  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;

  log('🚀 Starting Data Pull: [TiDB Cloud] ➡️ [Local MySQL]...\n');

  try {
    await localSequelize.authenticate();
    log('✅ Connected to Local MySQL.');

    await tidbSequelize.authenticate();
    log('✅ Connected to TiDB Cloud.\n');

    log('🔄 Checking database schema & migrations on Local MySQL...');
    const applied = await migrateUp(localSequelize);
    if (applied.length > 0) {
      log(`✅ Applied ${applied.length} pending migrations on Local: ${applied.join(', ')}`);
    } else {
      log('✅ Local database schema is up-to-date.');
    }

    const localDb = defineDb(localSequelize);
    const tidbDb = defineDb(tidbSequelize);

    const pullPlan = [
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

    log('\n📦 Pulling table records into Local MySQL...');
    const summary = [];

    for (const modelName of pullPlan) {
      const localModel = localDb[modelName];
      const tidbModel = tidbDb[modelName];
      if (!localModel || !tidbModel) continue;

      const records = await tidbModel.findAll({ raw: true });

      if (records.length === 0) {
        summary.push({ Table: modelName, 'TiDB Records': 0, 'Pulled to Local': 0, Status: 'No data' });
        continue;
      }

      let pulledCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await smartMirrorRecord(localModel, modelName, record);
          pulledCount++;
        } catch (err) {
          errorCount++;
          const details =
            err.errors && Array.isArray(err.errors)
              ? err.errors.map((e) => `${e.path || e.type}: ${e.message}`).join(', ')
              : err.message;
          warn(`   ⚠️ Error pulling ${modelName} ID ${record.id || record.staffId || record.userId || record.code}: ${details}`);
        }
      }

      summary.push({
        Table: modelName,
        'TiDB Records': records.length,
        'Pulled to Local': pulledCount,
        Status: errorCount === 0 ? '✅ Complete' : `⚠️ ${errorCount} errors`,
      });
    }

    if (!silent) {
      log('\n📊 Pull Summary:');
      console.table(summary);
      log('\n✨ TiDB Cloud records have been successfully pulled into Local MySQL!');
    }

    return { success: true, summary };
  } catch (error) {
    console.error('\n❌ Data pull failed:', error.message);
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
  pullFromTiDB({ isStandalone: true });
}

module.exports = {
  pullFromTiDB,
};
