const { DataTypes } = require("sequelize");

/**
 * Booking Model
 * Represents patient home-care visits and bookings
 */
module.exports = (sequelize) => {
  const Booking = sequelize.define(
    "Booking",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      clientId: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      clientName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      clientPhone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      patientName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      patientAge: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      patientGender: {
        type: DataTypes.ENUM("male", "female", "others"),
        allowNull: true,
      },
      relation: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "Mother",
      },
      serviceId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      service: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      serviceName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      categoryId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      plan: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Single visit",
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "mumbai",
      },
      area: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      date: {
        type: DataTypes.STRING(20), // YYYY-MM-DD
        allowNull: false,
      },
      time: {
        type: DataTypes.STRING(50), // e.g. '9:00 AM'
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "requested",
          "confirmed",
          "assigned",
          "on_the_way",
          "in_progress",
          "completed",
          "cancelled",
          "date_exceeded",
        ),
        defaultValue: "requested",
        allowNull: false,
      },
      staffId: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING(50),
        defaultValue: "App",
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      tasks: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      files: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: "Patient medical history attachments (prescriptions, discharge summaries, lab reports)",
      },
      visit: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
      reports: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: "Daily visit reports submitted by staff (vitals, tasks completed, observations, photos, docs)",
      },
      confirmedBy: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      assignedBy: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      assignedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      checkInAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      checkOutAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      history: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
    },
    {
      tableName: "bookings",
      timestamps: true,
      indexes: [
        { fields: ["city"] },
        { fields: ["status"] },
        { fields: ["date"] },
        { fields: ["staffId"] },
      ],
    },
  );

  return Booking;
};
