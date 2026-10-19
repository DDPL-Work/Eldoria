'use strict';

/**
 * Migration: Add `canConfirmBooking` and `canTransferBooking` columns to `staffs` table
 * Enables per-staff permissions for booking confirmation and colleague transfer.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('staffs');
    if (!table.canConfirmBooking) {
      await queryInterface.addColumn('staffs', 'canConfirmBooking', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether staff can confirm or reject bookings assigned to them',
      });
    }
    if (!table.canTransferBooking) {
      await queryInterface.addColumn('staffs', 'canTransferBooking', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether staff can transfer or reassign bookings to colleagues',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('staffs');
    if (table.canConfirmBooking) {
      await queryInterface.removeColumn('staffs', 'canConfirmBooking');
    }
    if (table.canTransferBooking) {
      await queryInterface.removeColumn('staffs', 'canTransferBooking');
    }
  },
};
