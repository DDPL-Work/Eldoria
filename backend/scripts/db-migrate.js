/**
 * Apply pending migrations: `npm run db:migrate`
 * Reference: QuoteMeTrip db-migrate script
 */
require("dotenv").config();
const { sequelize } = require("../src/configs/db.config");
const { migrateUp } = require("../src/database/migrations/runner");

async function run() {
  try {
    await sequelize.authenticate();
    const applied = await migrateUp(sequelize);
    console.log(
      applied.length === 0
        ? "No pending migrations."
        : `Applied: ${applied.join(", ")}`,
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
