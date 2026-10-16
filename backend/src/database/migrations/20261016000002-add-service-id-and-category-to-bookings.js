'use strict';

/**
 * Migration: Add `serviceId`, `categoryId`, and `category` columns to `bookings` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query('DESCRIBE `bookings`;');
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes('serviceId')) {
      await queryInterface.addColumn('bookings', 'serviceId', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'relation',
      });
      console.log('✅ Added serviceId column to bookings table');
    }

    if (!colNames.includes('categoryId')) {
      await queryInterface.addColumn('bookings', 'categoryId', {
        type: Sequelize.STRING(100),
        allowNull: true,
        after: 'serviceName',
      });
      console.log('✅ Added categoryId column to bookings table');
    }

    if (!colNames.includes('category')) {
      await queryInterface.addColumn('bookings', 'category', {
        type: Sequelize.STRING(150),
        allowNull: true,
        after: 'categoryId',
      });
      console.log('✅ Added category column to bookings table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const [cols] = await queryInterface.sequelize.query('DESCRIBE `bookings`;');
      const colNames = cols.map((c) => c.Field);

      if (colNames.includes('category')) {
        await queryInterface.removeColumn('bookings', 'category');
      }
      if (colNames.includes('categoryId')) {
        await queryInterface.removeColumn('bookings', 'categoryId');
      }
      if (colNames.includes('serviceId')) {
        await queryInterface.removeColumn('bookings', 'serviceId');
      }
      console.log('✅ Removed serviceId, categoryId, category columns from bookings table');
    } catch (err) {
      console.warn('⚠️ Could not remove columns from bookings table:', err.message);
    }
  },
};
