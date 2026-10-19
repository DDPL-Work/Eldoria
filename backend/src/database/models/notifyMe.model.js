const { DataTypes } = require("sequelize");

/**
 * NotifyMe Model
 * Tracks client subscriptions for categories or services marked as "Coming Soon" (e.g. Doctor Services).
 * When the category or service is launched by an admin, subscribers receive in-app notifications.
 */
module.exports = (sequelize) => {
  const NotifyMe = sequelize.define(
    "NotifyMe",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Optional reference to registered User ID",
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "Client 10-digit phone number for notification delivery",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
      targetType: {
        type: DataTypes.ENUM("category", "service"),
        allowNull: false,
        defaultValue: "category",
        comment: "Specifies whether interest is for an entire category (e.g. 'doctors') or a specific service",
      },
      targetId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Unique category identifier (e.g. 'doctors') or service code/slug (e.g. 'consult')",
      },
      targetName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Human-readable name of the category or service (e.g. 'Doctor Services')",
      },
      status: {
        type: DataTypes.ENUM("pending", "notified", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
        comment: "pending: waiting for launch; notified: in-app notification sent; cancelled: unsubscribed",
      },
      notifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      channel: {
        type: DataTypes.ENUM("in_app", "sms", "whatsapp", "all"),
        allowNull: false,
        defaultValue: "in_app",
      },
      source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "App",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: "notify_requests",
      timestamps: true,
      indexes: [
        {
          name: "idx_notify_phone_target",
          unique: true,
          fields: ["phone", "targetType", "targetId"],
        },
        {
          name: "idx_notify_target",
          fields: ["targetType", "targetId"],
        },
        {
          name: "idx_notify_status",
          fields: ["status"],
        },
        {
          name: "idx_notify_city",
          fields: ["city"],
        },
      ],
    }
  );

  return NotifyMe;
};
