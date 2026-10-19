'use strict';

/**
 * Migration: Add `bookingId` column to `enquiries` table
 * Links help request / care counseling enquiries directly to the converted Booking record.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('enquiries');
    if (!table.bookingId) {
      await queryInterface.addColumn('enquiries', 'bookingId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'ID of booking converted from this help request',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('enquiries');
    if (table.bookingId) {
      await queryInterface.removeColumn('enquiries', 'bookingId');
    }
  },
};
