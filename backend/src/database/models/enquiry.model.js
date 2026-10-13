const { DataTypes } = require('sequelize');

/**
 * Enquiry Model
 * Represents client inquiries / help requests (for care counseling)
 */
module.exports = (sequelize) => {
  const Enquiry = sequelize.define('Enquiry', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    clientId: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    clientName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    clientPhone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'mumbai'
    },
    area: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    patientType: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    patientAge: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    duration: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    timing: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    files: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'converted', 'closed'),
      defaultValue: 'new',
      allowNull: false
    },
    recommended: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    adminNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    history: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'enquiries',
    timestamps: true,
    indexes: [
      { fields: ['city'] },
      { fields: ['status'] }
    ]
  });

  return Enquiry;
};
