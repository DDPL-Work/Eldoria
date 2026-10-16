require('dotenv').config();
const { getLocalSequelize, getAivenSequelize } = require('../src/configs/db.config');
const { migrateUp } = require('../src/database/migrations/runner');

const localSequelize = getLocalSequelize();
const aivenSequelize = getAivenSequelize();

// Define models on both connections
const defineDb = (seq) => {
  return {
    Admin: require('../src/database/models/admin.model')(seq),
    City: require('../src/database/models/city.model')(seq),
    Service: require('../src/database/models/service.model')(seq),
    User: require('../src/database/models/user.model')(seq),
    Staff: require('../src/database/models/staff.model')(seq),
    Client: require('../src/database/models/client.model')(seq),
    Booking: require('../src/database/models/booking.model')(seq),
    Enquiry: require('../src/database/models/enquiry.model')(seq),
    Otp: require('../src/database/models/otp.model')(seq),
  };
};

async function syncToAiven() {
  console.log('🚀 Starting Data Synchronization: [Local MySQL] ➡️ [Aiven Cloud]...\n');

  try {
    // 1. Authenticate both connections
    await localSequelize.authenticate();
    console.log('✅ Connected to Local MySQL.');

    await aivenSequelize.authenticate();
    console.log('✅ Connected to Aiven MySQL Cloud.\n');

    // 2. Ensure migrations are applied on Aiven
    console.log('🔄 Checking database schema & migrations on Aiven Cloud...');
    const applied = await migrateUp(aivenSequelize);
    if (applied.length > 0) {
      console.log(`✅ Applied ${applied.length} pending migrations on Aiven: ${applied.join(', ')}`);
    } else {
      console.log('✅ Aiven database schema is up-to-date.');
    }

    const localDb = defineDb(localSequelize);
    const aivenDb = defineDb(aivenSequelize);

    // Sync in dependency order
    const syncPlan = [
      'Admin',
      'City',
      'Service',
      'User',
      'Staff',
      'Client',
      'Booking',
      'Enquiry',
      'Otp',
    ];

    console.log('\n📦 Synchronizing table records...');
    const summary = [];

    for (const modelName of syncPlan) {
      const localModel = localDb[modelName];
      const aivenModel = aivenDb[modelName];

      const records = await localModel.findAll({ raw: true });

      if (records.length === 0) {
        summary.push({ Table: modelName, 'Local Records': 0, 'Synced to Aiven': 0, Status: 'No data' });
        continue;
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await aivenModel.upsert(record);
          syncedCount++;
        } catch (err) {
          errorCount++;
          console.warn(`   ⚠️ Error syncing ${modelName} ID ${record.id || record.staffId || record.userId}: ${err.message}`);
        }
      }

      summary.push({
        Table: modelName,
        'Local Records': records.length,
        'Synced to Aiven': syncedCount,
        Status: errorCount === 0 ? '✅ Complete' : `⚠️ ${errorCount} errors`,
      });
    }

    console.log('\n📊 Synchronization Summary:');
    console.table(summary);
    console.log('\n✨ Local records have been successfully mirrored to Aiven Cloud MySQL!');

  } catch (error) {
    console.error('\n❌ Synchronization failed:', error.message);
    process.exit(1);
  } finally {
    await localSequelize.close().catch(() => {});
    await aivenSequelize.close().catch(() => {});
  }
}

syncToAiven();
