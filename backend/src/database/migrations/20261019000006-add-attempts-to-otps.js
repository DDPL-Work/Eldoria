'use strict';

/**
 * Migration: Add `attempts` column to `otps` table
 * Tracks failed verification attempts for brute-force protection (SEC-06).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('otps');
    if (!table.attempts) {
      await queryInterface.addColumn('otps', 'attempts', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Failed verification attempts counter for brute force lockout',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('otps');
    if (table.attempts) {
      await queryInterface.removeColumn('otps', 'attempts');
    }
  },
};
