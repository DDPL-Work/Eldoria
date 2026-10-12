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
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    otp: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    purpose: {
      type: DataTypes.ENUM('registration', 'login', 'phone_update', 'forgot_password'),
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
