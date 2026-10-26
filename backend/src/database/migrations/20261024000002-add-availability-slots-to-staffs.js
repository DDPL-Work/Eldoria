'use strict';

/**
 * Migration: Add `availabilitySlots` column to `staffs` table
 * Stores date-wise availability time slots defined by staff from calendar.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('staffs');
    if (!table.availabilitySlots) {
      await queryInterface.addColumn('staffs', 'availabilitySlots', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Date-wise availability time slots defined by staff from calendar',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('staffs');
    if (table.availabilitySlots) {
      await queryInterface.removeColumn('staffs', 'availabilitySlots');
    }
  },
};
