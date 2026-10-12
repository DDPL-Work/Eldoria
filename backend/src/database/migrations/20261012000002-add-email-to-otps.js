'use strict';

/**
 * Migration: Add `email` column and `forgot_password` purpose to `otps` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add email column to otps
    await queryInterface.addColumn('otps', 'email', {
      type: Sequelize.STRING(191),
      allowNull: true,
      after: 'phone'
    });

    // 2. Make phone column nullable (since email-based OTPs do not have phone)
    await queryInterface.changeColumn('otps', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    // 3. Update purpose ENUM to include 'forgot_password'
    await queryInterface.changeColumn('otps', 'purpose', {
      type: Sequelize.ENUM('registration', 'login', 'phone_update', 'forgot_password'),
      defaultValue: 'login',
      allowNull: false
    });

    // 4. Add index on email and purpose
    await queryInterface.addIndex('otps', ['email', 'purpose'], {
      name: 'otps_email_purpose_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('otps', 'otps_email_purpose_idx');
    } catch {}
    await queryInterface.removeColumn('otps', 'email');
    await queryInterface.changeColumn('otps', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: false
    });
    await queryInterface.changeColumn('otps', 'purpose', {
      type: Sequelize.ENUM('registration', 'login', 'phone_update'),
      defaultValue: 'login',
      allowNull: false
    });
  }
};
