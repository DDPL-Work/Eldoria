const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Staff = sequelize.define('Staff', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    staffId: {
      type: DataTypes.STRING,
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
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'others'),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    area: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    qualification: {
      type: DataTypes.STRING,
      allowNull: false
    },
    regNo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    experience: {
      type: DataTypes.STRING,
      allowNull: false
    },
    skills: {
      type: DataTypes.JSON, 
      allowNull: false,
      defaultValue: []
    },
    language: {
      type: DataTypes.JSON, 
      allowNull: true,
      defaultValue: []
    },
    availability: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    emergencyName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyPhone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    emergencyRelation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    files: {
      type: DataTypes.JSON, // Stores photo, idProof, qualification file objects with id, status, verified
      allowNull: true,
      defaultValue: {}
    },
    applied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    approval: {
      type: DataTypes.ENUM('pending', 'changes', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    docs: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    docChecks: {
      type: DataTypes.JSON, // Tracks verification state per document key e.g. { photo: true, idProof: true }
      allowNull: true,
      defaultValue: {}
    },
    reviewNote: {
      type: DataTypes.TEXT, // Admin review feedback / change request reason
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE, // Timestamp when care-desk admin reviewed the request
      allowNull: true
    },
    appHistory: {
      type: DataTypes.JSON, // Audit log of application status updates e.g. [{ at, status, by, note }]
      allowNull: true,
      defaultValue: []
    },
    onDuty: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'staffs',
    timestamps: true
  });

  return Staff;
};
