'use strict';

/**
 * Migration: Add 'date_exceeded' to `bookings` status enum
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE \`bookings\` MODIFY COLUMN \`status\` ENUM(
          'requested',
          'confirmed',
          'assigned',
          'on_the_way',
          'in_progress',
          'completed',
          'cancelled',
          'date_exceeded'
        ) NOT NULL DEFAULT 'requested';
      `);
    } catch (err) {
      try {
        await queryInterface.changeColumn('bookings', 'status', {
          type: Sequelize.ENUM(
            'requested',
            'confirmed',
            'assigned',
            'on_the_way',
            'in_progress',
            'completed',
            'cancelled',
            'date_exceeded'
          ),
          defaultValue: 'requested',
          allowNull: false,
        });
      } catch (innerErr) {
        console.warn('Warning updating bookings.status enum:', innerErr.message);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE \`bookings\` MODIFY COLUMN \`status\` ENUM(
          'requested',
          'confirmed',
          'assigned',
          'on_the_way',
          'in_progress',
          'completed',
          'cancelled'
        ) NOT NULL DEFAULT 'requested';
      `);
    } catch (_) {}
  },
};
