'use strict';

/**
 * Migration: Add `city` and `cityName` columns to `services` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query('DESCRIBE `services`;');
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes('city')) {
      await queryInterface.addColumn('services', 'city', {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
        after: 'type',
      });
      console.log('✅ Added city column to services table');
    }

    if (!colNames.includes('cityName')) {
      await queryInterface.addColumn('services', 'cityName', {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
        after: 'city',
      });
      console.log('✅ Added cityName column to services table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const [cols] = await queryInterface.sequelize.query('DESCRIBE `services`;');
      const colNames = cols.map((c) => c.Field);

      if (colNames.includes('cityName')) {
        await queryInterface.removeColumn('services', 'cityName');
      }
      if (colNames.includes('city')) {
        await queryInterface.removeColumn('services', 'city');
      }
      console.log('✅ Removed city and cityName columns from services table');
    } catch (err) {
      console.warn('⚠️ Could not remove city columns from services table:', err.message);
    }
  },
};
