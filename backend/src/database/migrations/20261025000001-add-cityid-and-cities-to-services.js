'use strict';

/**
 * Migration: Add `cityId` and `cities` to `services` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query('DESCRIBE `services`;');
    const colNames = cols.map((c) => c.Field.toLowerCase());

    if (!colNames.includes('cityid')) {
      await queryInterface.addColumn('services', 'cityId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
      console.log('✅ Added cityId column to services table');
    }

    if (!colNames.includes('cities')) {
      await queryInterface.addColumn('services', 'cities', {
        type: Sequelize.JSON,
        defaultValue: null,
        allowNull: true,
      });
      console.log('✅ Added cities column to services table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const [cols] = await queryInterface.sequelize.query('DESCRIBE `services`;');
      const colNames = cols.map((c) => c.Field.toLowerCase());

      if (colNames.includes('cities')) {
        await queryInterface.removeColumn('services', 'cities');
      }
      if (colNames.includes('cityid')) {
        await queryInterface.removeColumn('services', 'cityId');
      }
    } catch (err) {
      console.warn('⚠️ Could not remove city columns from services:', err.message);
    }
  },
};
