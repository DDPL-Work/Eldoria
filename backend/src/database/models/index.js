const { Sequelize } = require("sequelize");
const { sequelize } = require("../../configs/db.config");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Register models
db.Admin = require("./admin.model")(sequelize);
db.User = require("./user.model")(sequelize);
db.Staff = require("./staff.model")(sequelize);
db.Client = require("./client.model")(sequelize);
db.Otp = require("./otp.model")(sequelize);

// Associations: User (1) <-> Staff Profile (1) via staffId
db.User.hasOne(db.Staff, {
  foreignKey: "staffId",
  sourceKey: "staffId",
  as: "staffProfile",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

db.Staff.belongsTo(db.User, {
  foreignKey: "staffId",
  targetKey: "staffId",
  as: "user",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

// Associations: User (1) <-> Client Profile (1) via userId
db.User.hasOne(db.Client, {
  foreignKey: "userId",
  as: "clientProfile",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

db.Client.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

const { migrateUp, migrateDown } = require("../migrations/runner");

// Database migration & sync helper (QuoteMeTrip pattern)
db.syncDatabase = async (options = {}) => {
  try {
    // Run pending migrations from src/database/migrations tracked in SequelizeMeta
    const applied = await migrateUp(sequelize);
    if (applied.length > 0) {
      console.log(
        `✅ Database migrations applied successfully: ${applied.join(", ")}`,
      );
    } else {
      console.log("✅ Database migrations up-to-date (no pending migrations).");
    }

    // Optional model sync if explicitly requested (e.g. { force: true } or { alter: true })
    if (options && (options.force || options.alter)) {
      await sequelize.sync(options);
      console.log("✅ Database models synchronized successfully.");
    }
  } catch (error) {
    console.error(
      "❌ Failed to apply database migrations / synchronize models:",
      error.message,
    );
  }
};

db.migrateUp = () => migrateUp(sequelize);
db.migrateDown = (steps) => migrateDown(sequelize, steps);

module.exports = db;
