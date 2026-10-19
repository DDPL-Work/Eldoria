'use strict';

/**
 * Migration: Add `files` column to `bookings` table
 * Stores patient medical history documents (prescriptions, discharge summaries, lab reports)
 * uploaded during booking creation by client or care desk admin.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('bookings');
    if (!table.files) {
      await queryInterface.addColumn('bookings', 'files', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Patient medical history attachments (prescriptions, discharge summaries, lab reports)',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('bookings');
    if (table.files) {
      await queryInterface.removeColumn('bookings', 'files');
    }
  },
};
