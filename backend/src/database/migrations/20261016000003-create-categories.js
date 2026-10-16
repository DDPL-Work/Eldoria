'use strict';

/**
 * Migration: Create `categories` table and populate existing categories
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create categories table if not exists
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      categoryId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      desc: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'cross',
      },
      kind: {
        type: Sequelize.ENUM('care', 'equipment', 'doctor', 'other'),
        allowNull: false,
        defaultValue: 'care',
      },
      type: {
        type: Sequelize.ENUM('care', 'equipment', 'doctor', 'other'),
        allowNull: false,
        defaultValue: 'care',
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      comingSoon: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 2. Add indexes
    await queryInterface.addIndex('categories', ['categoryId']).catch(() => {});
    await queryInterface.addIndex('categories', ['enabled']).catch(() => {});
    await queryInterface.addIndex('categories', ['order']).catch(() => {});

    // 3. Populate existing categories from services table if available
    try {
      const [services] = await queryInterface.sequelize.query(
        `SELECT DISTINCT category, categoryName, categoryDesc, categoryIcon, categoryOrder, type, enabled, comingSoon FROM services WHERE category IS NOT NULL`
      );

      const seen = new Set();
      const rows = [];
      const now = new Date();

      for (const s of services) {
        const catKey = String(s.category || '').trim().toLowerCase();
        if (!catKey || seen.has(catKey)) continue;
        seen.add(catKey);

        const catName = s.categoryName || s.category || catKey;
        const catType = ['care', 'equipment', 'doctor', 'other'].includes(s.type) ? s.type : 'care';

        rows.push({
          categoryId: catKey,
          name: catName,
          desc: s.categoryDesc || null,
          icon: s.categoryIcon || 'cross',
          kind: catType,
          type: catType,
          order: Number(s.categoryOrder) || 0,
          enabled: s.enabled !== false && s.enabled !== 0,
          comingSoon: Boolean(s.comingSoon),
          createdAt: now,
          updatedAt: now,
        });
      }

      if (rows.length > 0) {
        await queryInterface.bulkInsert('categories', rows, { ignoreDuplicates: true });
      }
    } catch (_) {
      // If services table query fails, ignore (e.g. fresh installation)
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('categories');
  },
};
