/**
 * Revert recent migrations: `npm run db:migrate:undo`
 * Optional: `--steps=N` (default 1)
 * Reference: QuoteMeTrip db-migrate-undo script
 */
require("dotenv").config();
const { sequelize } = require("../src/configs/db.config");
const { migrateDown } = require("../src/database/migrations/runner");

const stepsArg = process.argv.find((arg) => arg.startsWith("--steps="));
const steps = stepsArg ? parseInt(stepsArg.split("=")[1], 10) : 1;

async function run() {
  try {
    await sequelize.authenticate();
    const reverted = await migrateDown(sequelize, steps);
    console.log(
      reverted.length === 0
        ? "Nothing to revert."
        : `Reverted: ${reverted.join(", ")}`,
    );
  } catch (error) {
    console.error("❌ Revert failed:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
