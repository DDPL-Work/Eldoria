'use strict';

/**
 * Migration: Update `staffs` table to:
 * 1. Expand `approval` ENUM to include 'changes': ENUM('pending', 'changes', 'approved', 'rejected')
 * 2. Add `docChecks` (JSON) to track verification state of required & optional documents
 * 3. Add `reviewNote` (TEXT) for feedback given to the staff applicant
 * 4. Add `reviewedAt` (DATETIME) for when care-desk admin reviews the application
 * 5. Add `appHistory` (JSON) for tracking audit history of changes/approval/rejections
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Expand approval ENUM
    await queryInterface.sequelize.query(
      "ALTER TABLE `staffs` MODIFY COLUMN `approval` ENUM('pending', 'changes', 'approved', 'rejected') NOT NULL DEFAULT 'pending';"
    );

    // 2. Introspect existing columns to be idempotent
    const [cols] = await queryInterface.sequelize.query("DESCRIBE `staffs`;");
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes('docChecks')) {
      await queryInterface.addColumn('staffs', 'docChecks', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      });
    }

    if (!colNames.includes('reviewNote')) {
      await queryInterface.addColumn('staffs', 'reviewNote', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!colNames.includes('reviewedAt')) {
      await queryInterface.addColumn('staffs', 'reviewedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!colNames.includes('appHistory')) {
      await queryInterface.addColumn('staffs', 'appHistory', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('staffs', 'appHistory');
    } catch (_) {}

    try {
      await queryInterface.removeColumn('staffs', 'reviewedAt');
    } catch (_) {}

    try {
      await queryInterface.removeColumn('staffs', 'reviewNote');
    } catch (_) {}

    try {
      await queryInterface.removeColumn('staffs', 'docChecks');
    } catch (_) {}

    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE `staffs` MODIFY COLUMN `approval` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending';"
      );
    } catch (_) {}
  }
};
