'use strict';

/**
 * Migration: Make `email` nullable in `users` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.changeColumn('users', 'email', {
        type: Sequelize.STRING(191),
        allowNull: true,
        unique: true,
      });
      console.log('✅ Altered users.email to allowNull: true');
    } catch (err) {
      // Fallback direct raw SQL for MySQL / TiDB
      await queryInterface.sequelize.query('ALTER TABLE `users` MODIFY COLUMN `email` VARCHAR(191) NULL;');
      console.log('✅ Altered users.email to NULL via raw SQL');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.changeColumn('users', 'email', {
        type: Sequelize.STRING(191),
        allowNull: false,
        unique: true,
      });
    } catch (_) {}
  },
};
