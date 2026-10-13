const { DataTypes } = require('sequelize');

/**
 * City Model
 * Represents operational operating cities for Eldoria Care at Home
 */
module.exports = (sequelize) => {
  const City = sequelize.define('City', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    cityId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "Unique slug identifier e.g. 'mumbai', 'thane', 'navi-mumbai'"
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: "Display name e.g. 'Mumbai', 'Thane'"
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "Dedicated Care Desk Call phone (10 digits)"
    },
    whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "Dedicated WhatsApp number (10 digits)"
    },
    isLive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: "true = operational/live, false = paused/deactivated"
    },
    hidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "false = live, true = paused (for backward/UI store compatibility)"
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'cities',
    timestamps: true,
    indexes: [
      { fields: ['cityId'] },
      { fields: ['isLive'] },
      { fields: ['order'] }
    ]
  });

  return City;
};
