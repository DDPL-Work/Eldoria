const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Otp = sequelize.define('Otp', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    purpose: {
      type: DataTypes.ENUM('registration', 'login'),
      defaultValue: 'login',
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'otps',
    timestamps: true
  });

  return Otp;
};
