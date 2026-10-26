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
db.Booking = require("./booking.model")(sequelize);
db.Enquiry = require("./enquiry.model")(sequelize);
db.City = require("./city.model")(sequelize);
db.Service = require("./service.model")(sequelize);
db.Category = require("./category.model")(sequelize);
db.Setting = require("./setting.model")(sequelize);
db.NotifyMe = require("./notifyMe.model")(sequelize);
db.InAppNotification = require("./inAppNotification.model")(sequelize);

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

// Associations: User (1) <-> NotifyMe (*)
db.User.hasMany(db.NotifyMe, {
  foreignKey: "userId",
  as: "notifyRequests",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

db.NotifyMe.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Associations: User (1) <-> InAppNotification (*)
db.User.hasMany(db.InAppNotification, {
  foreignKey: "userId",
  as: "inAppNotifications",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

db.InAppNotification.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Associations: Staff (1) <-> Booking (*)
db.Booking.belongsTo(db.Staff, {
  foreignKey: "staffId",
  targetKey: "staffId",
  as: "assignedStaff",
  constraints: false
});

db.Staff.hasMany(db.Booking, {
  foreignKey: "staffId",
  sourceKey: "staffId",
  as: "bookings",
  constraints: false
});

// Associations: City (1) <-> Service (*)
db.Service.belongsTo(db.City, {
  foreignKey: "cityId",
  as: "primaryCity",
  constraints: false
});

db.City.hasMany(db.Service, {
  foreignKey: "cityId",
  as: "services",
  constraints: false
});

// Associations: Enquiry (1) <-> Booking (1) via bookingId
db.Enquiry.belongsTo(db.Booking, {
  foreignKey: "bookingId",
  as: "booking",
  constraints: false,
});

db.Booking.hasOne(db.Enquiry, {
  foreignKey: "bookingId",
  as: "enquiry",
  constraints: false,
});


const { migrateUp, migrateDown } = require("../migrations/runner");
const { attachAivenSyncHooks } = require("../../services/dbSync.service");

// Attach real-time replication hooks if running in local mode with sync enabled
attachAivenSyncHooks(db);

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

    // Also ensure migrations are applied on target sync connection (e.g. Aiven Cloud) if sync is enabled
    try {
      const { isLocal, getAivenSequelize } = require("../../configs/db.config");
      const targetSeq = isLocal ? getAivenSequelize() : null;
      if (targetSeq) {
        const aivenApplied = await migrateUp(targetSeq);
        if (aivenApplied.length > 0) {
          console.log(`✅ Aiven Cloud database migrations applied: ${aivenApplied.join(", ")}`);
        }
      }
    } catch (aivenMigErr) {
      console.warn("⚠️ Aiven Cloud migration check note:", aivenMigErr.message);
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

