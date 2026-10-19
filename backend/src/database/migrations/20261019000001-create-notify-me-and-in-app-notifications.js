'use strict';

/**
 * Migration: Create `notify_requests` and `in_app_notifications` tables
 * Enables "Notify Me" subscriptions for Coming Soon categories/services (e.g. Doctor Services)
 * and delivers in-app notifications upon launch.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create `notify_requests` table
    await queryInterface.createTable('notify_requests', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'mumbai',
      },
      area: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      targetType: {
        type: Sequelize.ENUM('category', 'service'),
        allowNull: false,
        defaultValue: 'category',
      },
      targetId: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      targetName: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'notified', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      notifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      channel: {
        type: Sequelize.ENUM('in_app', 'sms', 'whatsapp', 'all'),
        allowNull: false,
        defaultValue: 'in_app',
      },
      source: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'App',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Indexes for `notify_requests`
    await queryInterface.addIndex('notify_requests', ['phone', 'targetType', 'targetId'], {
      unique: true,
      name: 'idx_notify_phone_target',
    }).catch(() => {});
    await queryInterface.addIndex('notify_requests', ['targetType', 'targetId']).catch(() => {});
    await queryInterface.addIndex('notify_requests', ['status']).catch(() => {});
    await queryInterface.addIndex('notify_requests', ['city']).catch(() => {});

    // 2. Create `in_app_notifications` table
    await queryInterface.createTable('in_app_notifications', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('coming_soon_launch', 'booking_update', 'announcement', 'general'),
        allowNull: false,
        defaultValue: 'coming_soon_launch',
      },
      targetType: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      targetId: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      actionUrl: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'steth',
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Indexes for `in_app_notifications`
    await queryInterface.addIndex('in_app_notifications', ['phone']).catch(() => {});
    await queryInterface.addIndex('in_app_notifications', ['userId']).catch(() => {});
    await queryInterface.addIndex('in_app_notifications', ['isRead']).catch(() => {});
    await queryInterface.addIndex('in_app_notifications', ['createdAt']).catch(() => {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('in_app_notifications').catch(() => {});
    await queryInterface.dropTable('notify_requests').catch(() => {});
  },
};
