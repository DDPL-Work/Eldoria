'use strict';

/**
 * Migration: Create `staffs` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staffs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      staffId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'staffId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      dob: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'others'),
        allowNull: false
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      area: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      qualification: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      regNo: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      experience: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      skills: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]'
      },
      language: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '[]'
      },
      availability: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]'
      },
      emergencyName: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      emergencyPhone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      emergencyRelation: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      files: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: '{}'
      },
      applied: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      approval: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      docs: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      onDuty: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejectedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('staffs');
  }
};
