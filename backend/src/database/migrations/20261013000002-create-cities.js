'use strict';

/**
 * Migration: Create `cities` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cities', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      cityId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 99,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      whatsapp: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      isLive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      hidden: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    try {
      await queryInterface.addIndex('cities', ['cityId'], { name: 'cities_cityId_idx' });
      await queryInterface.addIndex('cities', ['isLive'], { name: 'cities_isLive_idx' });
      await queryInterface.addIndex('cities', ['order'], { name: 'cities_order_idx' });
    } catch (_) {}
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cities');
  }
};
