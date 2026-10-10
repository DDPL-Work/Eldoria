'use strict';

/**
 * Migration: Create `clients` table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('clients', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      clientId: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'mumbai'
      },
      area: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pincode: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      landmark: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      patientName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      patientAge: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      patientGender: {
        type: Sequelize.ENUM('male', 'female', 'others'),
        allowNull: true
      },
      relation: {
        type: Sequelize.ENUM('Mother', 'Father', 'Self', 'Spouse', 'Grandparent', 'Other'),
        allowNull: true,
        defaultValue: 'Mother'
      },
      patientType: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      medicalConditions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      mobilityStatus: {
        type: Sequelize.ENUM('independent', 'walks_with_support', 'wheelchair_bound', 'bedridden'),
        allowNull: true
      },
      requiredService: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      preferredPlan: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      preferredTiming: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      expectedDuration: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      specialInstructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      emergencyName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      emergencyPhone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      emergencyRelation: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      files: {
        type: Sequelize.JSON,
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('Call', 'WhatsApp', 'App', 'Walk-in', 'Website', 'Referral'),
        defaultValue: 'App',
        allowNull: false
      },
      preferredLanguage: {
        type: Sequelize.STRING(50),
        defaultValue: 'English',
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'archived'),
        defaultValue: 'active',
        allowNull: false
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

    await queryInterface.addIndex('clients', ['city'], {
      name: 'clients_city_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('clients');
  }
};
