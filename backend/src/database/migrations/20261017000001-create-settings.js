'use strict';

/**
 * Migration: Create `settings` table and initialize default 'app' configuration
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create settings table
    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false,
        defaultValue: 'app',
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '9820012345',
      },
      whatsapp: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '9820012345',
      },
      heroVideo: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      staffCanConfirm: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      extra: {
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

    // 2. Insert default 'app' record if not already present
    try {
      const now = new Date();
      await queryInterface.bulkInsert(
        'settings',
        [
          {
            id: 'app',
            phone: '9820012345',
            whatsapp: '9820012345',
            heroVideo: '',
            staffCanConfirm: true,
            extra: JSON.stringify({}),
            createdAt: now,
            updatedAt: now,
          },
        ],
        { ignoreDuplicates: true }
      );
    } catch (_) {}
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('settings');
  },
};
