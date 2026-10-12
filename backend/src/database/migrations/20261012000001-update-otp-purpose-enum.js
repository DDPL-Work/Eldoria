'use strict';

/**
 * Migration: Add 'phone_update' to `otps` purpose enum
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('otps', 'purpose', {
      type: Sequelize.ENUM('registration', 'login', 'phone_update'),
      defaultValue: 'login',
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('otps', 'purpose', {
      type: Sequelize.ENUM('registration', 'login'),
      defaultValue: 'login',
      allowNull: false
    });
  }
};
