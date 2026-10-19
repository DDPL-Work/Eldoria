const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    serviceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    categoryName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    categoryIcon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'cross',
    },
    categoryDesc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('care', 'equipment', 'doctor', 'other'),
      defaultValue: 'care',
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: "Operating city id e.g. 'mumbai', 'thane', 'lucknow'",
    },
    cityName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: "Display name e.g. 'Mumbai', 'Thane'",
    },
    desc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      defaultValue: 'cross',
      allowNull: false,
    },
    image: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    priceMode: {
      type: DataTypes.ENUM('fixed', 'contact'),
      defaultValue: 'fixed',
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(50),
      defaultValue: 'per visit',
      allowNull: false,
    },
    options: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
    },
    tasks: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    comingSoon: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  }, {
    tableName: 'services',
    timestamps: true,
    indexes: [
      { fields: ['code'], unique: true },
      { fields: ['category'] },
      { fields: ['type'] },
      { fields: ['enabled'] },
      { fields: ['order'] },
    ],
    hooks: {
      beforeValidate: async (service, options) => {
        if (!service.code) {
          const { generateServiceCode } = require('../../helpers/generateServiceID');
          service.code = await generateServiceCode(
            {
              category: service.category,
              type: service.type,
              addedDate: service.createdAt || new Date(),
              transaction: options.transaction || null,
            }
          );
        }
      },
    },
  });

  return Service;
};
