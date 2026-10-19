/**
 * Apply pending migrations: `npm run db:migrate`
 * Applies migrations to primary DB (Local or Server) and mirrors to Aiven Cloud DB
 */
require("dotenv").config();
const { sequelize, getAivenSequelize, isLocal } = require("../src/configs/db.config");
const { migrateUp } = require("../src/database/migrations/runner");

async function run() {
  try {
    console.log("🔄 Running migrations on primary connection...");
    await sequelize.authenticate();
    const applied = await migrateUp(sequelize);
    console.log(
      applied.length === 0
        ? "✅ No pending migrations on primary DB."
        : `✅ Applied on primary DB: ${applied.join(", ")}`,
    );

    // If running in local mode with Aiven background sync, ensure Aiven Cloud schema is also migrated
    if (isLocal) {
      try {
        const aivenSequelize = getAivenSequelize();
        await aivenSequelize.authenticate();
        console.log("🔄 Checking & running migrations on Aiven Cloud MySQL...");
        const aivenApplied = await migrateUp(aivenSequelize);
        console.log(
          aivenApplied.length === 0
            ? "✅ No pending migrations on Aiven Cloud DB."
            : `✅ Applied on Aiven Cloud DB: ${aivenApplied.join(", ")}`,
        );
      } catch (aivenErr) {
        console.warn("⚠️ Could not migrate Aiven Cloud DB:", aivenErr.message);
      }
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
