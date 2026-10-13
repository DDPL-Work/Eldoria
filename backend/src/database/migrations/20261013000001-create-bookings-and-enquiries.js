'use strict';

/**
 * Migration: Create `bookings` and `enquiries` tables
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create `bookings` table
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      clientId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      clientName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      clientPhone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      patientName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      patientAge: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      patientGender: {
        type: Sequelize.ENUM('male', 'female', 'others'),
        allowNull: true
      },
      relation: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'Mother'
      },
      service: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      serviceName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      plan: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'Single visit'
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
        allowNull: false
      },
      date: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      time: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM(
          'requested',
          'confirmed',
          'assigned',
          'on_the_way',
          'in_progress',
          'completed',
          'cancelled'
        ),
        defaultValue: 'requested',
        allowNull: false
      },
      staffId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      source: {
        type: Sequelize.STRING(50),
        defaultValue: 'App',
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      tasks: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      visit: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      confirmedBy: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      confirmedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      assignedBy: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      assignedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      checkInAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      checkOutAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      history: {
        type: Sequelize.JSON,
        defaultValue: []
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

    try {
      await queryInterface.addIndex('bookings', ['city'], { name: 'bookings_city_idx' });
      await queryInterface.addIndex('bookings', ['status'], { name: 'bookings_status_idx' });
      await queryInterface.addIndex('bookings', ['date'], { name: 'bookings_date_idx' });
      await queryInterface.addIndex('bookings', ['staffId'], { name: 'bookings_staffId_idx' });
    } catch (_) {}

    // 2. Create `enquiries` table
    await queryInterface.createTable('enquiries', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      clientId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      clientName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      clientPhone: {
        type: Sequelize.STRING(20),
        allowNull: false
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      patientType: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      patientAge: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      duration: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      timing: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      files: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      status: {
        type: Sequelize.ENUM('new', 'contacted', 'converted', 'closed'),
        defaultValue: 'new',
        allowNull: false
      },
      recommended: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      adminNote: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      history: {
        type: Sequelize.JSON,
        defaultValue: []
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

    try {
      await queryInterface.addIndex('enquiries', ['city'], { name: 'enquiries_city_idx' });
      await queryInterface.addIndex('enquiries', ['status'], { name: 'enquiries_status_idx' });
    } catch (_) {}
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('enquiries');
    await queryInterface.dropTable('bookings');
  }
};
