const { DataTypes } = require('sequelize');

/**
 * Setting Model
 * Represents global application settings (Care Desk contact, permissions, and configurations)
 */
module.exports = (sequelize) => {
  const Setting = sequelize.define('Setting', {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: 'app',
      comment: "Unique setting group identifier, e.g. 'app'"
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '9820012345',
      comment: "Global Care Desk Call phone (10 digits)"
    },
    whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '9820012345',
      comment: "Global Care Desk WhatsApp number (10 digits)"
    },
    heroVideo: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
      comment: "Optional MP4 URL for animated headers across client and staff apps"
    },
    staffCanConfirm: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Flag whether caregivers can confirm & assign visits directly from staff app"
    },
    extra: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Extended custom settings key-value pairs"
    }
  }, {
    tableName: 'settings',
    timestamps: true
  });

  return Setting;
};
