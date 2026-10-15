'use strict';

/**
 * Migration: Create `services` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('services', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      serviceId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      categoryName: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      categoryIcon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'cross',
      },
      categoryDesc: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      categoryOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: Sequelize.ENUM('care', 'equipment', 'doctor', 'other'),
        allowNull: false,
        defaultValue: 'care',
      },
      desc: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'cross',
      },
      image: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      priceMode: {
        type: Sequelize.ENUM('fixed', 'contact'),
        allowNull: false,
        defaultValue: 'fixed',
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'per visit',
      },
      options: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      tasks: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      comingSoon: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    try {
      await queryInterface.addIndex('services', ['code'], { name: 'services_code_idx', unique: true });
      await queryInterface.addIndex('services', ['category'], { name: 'services_category_idx' });
      await queryInterface.addIndex('services', ['type'], { name: 'services_type_idx' });
      await queryInterface.addIndex('services', ['enabled'], { name: 'services_enabled_idx' });
      await queryInterface.addIndex('services', ['order'], { name: 'services_order_idx' });
    } catch (_) {}
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('services');
  },
};
