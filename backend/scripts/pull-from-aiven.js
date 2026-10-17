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

async function pullFromAiven() {
  console.log('🚀 Starting Data Pull: [Aiven Cloud] ➡️ [Local MySQL]...\n');

  try {
    // 1. Authenticate both connections
    await localSequelize.authenticate();
    console.log('✅ Connected to Local MySQL.');

    await aivenSequelize.authenticate();
    console.log('✅ Connected to Aiven MySQL Cloud.\n');

    // 2. Ensure migrations are applied on Local
    console.log('🔄 Checking database schema & migrations on Local MySQL...');
    const applied = await migrateUp(localSequelize);
    if (applied.length > 0) {
      console.log(`✅ Applied ${applied.length} pending migrations on Local: ${applied.join(', ')}`);
    } else {
      console.log('✅ Local database schema is up-to-date.');
    }

    const localDb = defineDb(localSequelize);
    const aivenDb = defineDb(aivenSequelize);

    // Pull in dependency order
    const pullPlan = [
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

    console.log('\n📦 Pulling table records into Local MySQL...');
    const summary = [];

    for (const modelName of pullPlan) {
      const localModel = localDb[modelName];
      const aivenModel = aivenDb[modelName];

      const records = await aivenModel.findAll({ raw: true });

      if (records.length === 0) {
        summary.push({ Table: modelName, 'Aiven Records': 0, 'Pulled to Local': 0, Status: 'No data' });
        continue;
      }

      let pulledCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await localModel.upsert(record);
          pulledCount++;
        } catch (err) {
          errorCount++;
          console.warn(`   ⚠️ Error pulling ${modelName} ID ${record.id || record.staffId || record.userId}: ${err.message}`);
        }
      }

      summary.push({
        Table: modelName,
        'Aiven Records': records.length,
        'Pulled to Local': pulledCount,
        Status: errorCount === 0 ? '✅ Complete' : `⚠️ ${errorCount} errors`,
      });
    }

    console.log('\n📊 Pull Summary:');
    console.table(summary);
    console.log('\n✨ Cloud entries from Aiven have been successfully pulled into Local MySQL!');

  } catch (error) {
    console.error('\n❌ Data pull failed:', error.message);
    process.exit(1);
  } finally {
    await localSequelize.close().catch(() => {});
    await aivenSequelize.close().catch(() => {});
  }
}

pullFromAiven();
