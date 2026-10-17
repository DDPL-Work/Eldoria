const { DataTypes } = require('sequelize');

/**
 * Category Model
 * Represents catalog service categories (e.g. Elder Care, Home Nursing, Physiotherapy)
 */
module.exports = (sequelize) => {
  const Category = sequelize.define(
    'Category',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      categoryId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: "Unique slug identifier e.g. 'elder', 'nursingcare', 'diagnostics'",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: "Display name e.g. 'Elder Care', 'Home Nursing', 'Diagnostics'",
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
      kind: {
        type: DataTypes.ENUM('care', 'equipment', 'doctor', 'other'),
        defaultValue: 'care',
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('care', 'equipment', 'doctor', 'other'),
        defaultValue: 'care',
        allowNull: false,
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
    },
    {
      tableName: 'categories',
      timestamps: true,
      indexes: [
        { fields: ['categoryId'] },
        { fields: ['enabled'] },
        { fields: ['order'] },
      ],
    }
  );

  return Category;
};
