'use strict';

/**
 * Migration: Add `registrationStatus` ENUM column to `staffs` table
 * Matches: staff.model.js line 97-108
 * ENUM('in_progress', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected')
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query('DESCRIBE `staffs`;');
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes('registrationStatus')) {
      await queryInterface.addColumn('staffs', 'registrationStatus', {
        type: Sequelize.ENUM(
          'in_progress',
          'submitted',
          'under_review',
          'changes_requested',
          'approved',
          'rejected'
        ),
        allowNull: false,
        defaultValue: 'in_progress',
        after: 'approval'
      });
      console.log('✅ Added registrationStatus column to staffs table');
    } else {
      console.log('ℹ️ registrationStatus column already exists in staffs table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const [cols] = await queryInterface.sequelize.query('DESCRIBE `staffs`;');
      const colNames = cols.map((c) => c.Field);

      if (colNames.includes('registrationStatus')) {
        await queryInterface.removeColumn('staffs', 'registrationStatus');
        console.log('✅ Removed registrationStatus column from staffs table');
      }
    } catch (err) {
      console.warn('⚠️ Could not remove registrationStatus column:', err.message);
    }
  }
};
