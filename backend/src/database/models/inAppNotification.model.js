const { DataTypes } = require("sequelize");

/**
 * InAppNotification Model
 * Stores in-app alerts and notifications delivered to client accounts.
 * Used for service launches (e.g. Doctor Services coming soon launch), booking updates, and announcements.
 */
module.exports = (sequelize) => {
  const InAppNotification = sequelize.define(
    "InAppNotification",
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
        comment: "Optional reference to User ID",
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "Phone number of recipient client",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          "coming_soon_launch",
          "booking_update",
          "announcement",
          "general"
        ),
        allowNull: false,
        defaultValue: "coming_soon_launch",
      },
      targetType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "category, service, or booking",
      },
      targetId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Identifier of the target entity e.g. 'doctors' or 'consult'",
      },
      actionUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "Deep link or routing path for client in-app navigation",
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "steth",
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: "in_app_notifications",
      timestamps: true,
      indexes: [
        {
          name: "idx_inapp_phone",
          fields: ["phone"],
        },
        {
          name: "idx_inapp_userId",
          fields: ["userId"],
        },
        {
          name: "idx_inapp_isRead",
          fields: ["isRead"],
        },
        {
          name: "idx_inapp_createdAt",
          fields: ["createdAt"],
        },
      ],
    }
  );

  return InAppNotification;
};
