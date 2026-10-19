'use strict';

/**
 * Migration: Add `reports` column to `bookings` table
 * Stores daily visit reports submitted by staff:
 * vitals (BP, pulse, SpO2, temp, sugar), tasks done, notes, photos, and report documents.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('bookings');
    if (!table.reports) {
      await queryInterface.addColumn('bookings', 'reports', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Daily visit reports submitted by staff (vitals, tasks completed, observations, photos, docs)',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('bookings');
    if (table.reports) {
      await queryInterface.removeColumn('bookings', 'reports');
    }
  },
};
