const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    staffId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isOnlyForStaff(value) {
          if (value && this.role !== 'staff') {
            throw new Error('staffId is only applicable for users whose role is staff');
          }
        }
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    role: {
      type: DataTypes.ENUM('staff', 'client'),
      defaultValue: 'staff'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};
