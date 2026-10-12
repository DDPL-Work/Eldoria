/**
 * Lightweight migration runner (based on QuoteMeTrip runner design).
 *
 * Applies versioned migration modules from `src/migrations/` and
 * tracks them in the `SequelizeMeta` table — the production schema
 * mechanism compatible with Sequelize CLI.
 *
 * Migration modules export `up(queryInterface, Sequelize)` and
 * `down(queryInterface, Sequelize)` and are applied in filename order.
 */
const fs = require('fs').promises;
const path = require('path');
const { DataTypes, Sequelize } = require('sequelize');

const MIGRATIONS_DIR = path.resolve(__dirname);
const META_TABLE = 'SequelizeMeta';

async function listModules(dir = MIGRATIONS_DIR) {
  const entries = await fs.readdir(dir);
  return entries
    .filter((name) => name.endsWith('.js') && !name.includes('runner'))
    .sort();
}

function loadModule(dir, name) {
  const fullPath = path.join(dir, name);
  delete require.cache[require.resolve(fullPath)];
  const mod = require(fullPath);
  return mod.default || mod;
}

async function ensureMetaTable(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name)).flat();

  if (!names.includes(META_TABLE)) {
    await queryInterface.createTable(META_TABLE, {
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
    });
  }
}

async function getAppliedNames(sequelize) {
  await ensureMetaTable(sequelize);
  const [rows] = await sequelize.query(`SELECT \`name\` FROM \`${META_TABLE}\``);
  return new Set(rows.map((row) => row.name));
}

/**
 * Apply all pending migrations in order. Returns the applied names.
 */
async function migrateUp(sequelize) {
  const applied = await getAppliedNames(sequelize);
  const queryInterface = sequelize.getQueryInterface();
  const done = [];

  const modules = await listModules(MIGRATIONS_DIR);
  for (const name of modules) {
    if (applied.has(name)) {
      continue;
    }

    const migration = loadModule(MIGRATIONS_DIR, name);
    if (typeof migration.up === 'function') {
      await migration.up(queryInterface, Sequelize);
    }

    await sequelize.query(`INSERT INTO \`${META_TABLE}\` (\`name\`) VALUES (?)`, {
      replacements: [name],
    });
    done.push(name);
  }

  return done;
}

/**
 * Revert the last `steps` applied migrations (default 1).
 * Returns the reverted names (most recent first).
 */
async function migrateDown(sequelize, steps = 1) {
  await ensureMetaTable(sequelize);
  const [rows] = await sequelize.query(
    `SELECT \`name\` FROM \`${META_TABLE}\` ORDER BY \`name\` DESC LIMIT ?`,
    { replacements: [steps] }
  );

  const queryInterface = sequelize.getQueryInterface();
  const done = [];

  for (const { name } of rows) {
    const migration = loadModule(MIGRATIONS_DIR, name);
    if (typeof migration.down === 'function') {
      await migration.down(queryInterface, Sequelize);
    }

    await sequelize.query(`DELETE FROM \`${META_TABLE}\` WHERE \`name\` = ?`, {
      replacements: [name],
    });
    done.push(name);
  }

  return done;
}

module.exports = {
  migrateUp,
  migrateDown,
  ensureMetaTable,
  getAppliedNames,
  listModules,
};
