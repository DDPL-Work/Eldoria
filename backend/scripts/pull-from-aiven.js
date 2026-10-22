require('dotenv').config();
const { getLocalSequelize, getAivenSequelize } = require('../src/configs/db.config');
const { migrateUp } = require('../src/database/migrations/runner');
const { defineDb, smartMirrorRecord } = require('./sync-to-aiven');

const localSequelize = getLocalSequelize();
const aivenSequelize = getAivenSequelize();

async function pullFromAiven(options = {}) {
  const { isStandalone = false, silent = false } = options;
  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;

  log('🚀 Starting Data Pull: [Aiven Cloud] ➡️ [Local MySQL]...\n');

  try {
    await localSequelize.authenticate();
    log('✅ Connected to Local MySQL.');

    await aivenSequelize.authenticate();
    log('✅ Connected to Aiven MySQL Cloud.\n');

    log('🔄 Checking database schema & migrations on Local MySQL...');
    const applied = await migrateUp(localSequelize);
    if (applied.length > 0) {
      log(`✅ Applied ${applied.length} pending migrations on Local: ${applied.join(', ')}`);
    } else {
      log('✅ Local database schema is up-to-date.');
    }

    const localDb = defineDb(localSequelize);
    const aivenDb = defineDb(aivenSequelize);

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
      const aivenModel = aivenDb[modelName];
      if (!localModel || !aivenModel) continue;

      const records = await aivenModel.findAll({ raw: true });

      if (records.length === 0) {
        summary.push({ Table: modelName, 'Aiven Records': 0, 'Pulled to Local': 0, Status: 'No data' });
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
          warn(`   ⚠️ Error pulling ${modelName} ID ${record.id || record.staffId || record.userId}: ${details}`);
        }
      }

      summary.push({
        Table: modelName,
        'Aiven Records': records.length,
        'Pulled to Local': pulledCount,
        Status: errorCount === 0 ? '✅ Complete' : `⚠️ ${errorCount} errors`,
      });
    }

    if (!silent) {
      log('\n📊 Pull Summary:');
      console.table(summary);
      log('\n✨ Cloud entries from Aiven have been successfully pulled into Local MySQL!');
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
      await aivenSequelize.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  pullFromAiven({ isStandalone: true });
}

module.exports = {
  pullFromAiven,
};
