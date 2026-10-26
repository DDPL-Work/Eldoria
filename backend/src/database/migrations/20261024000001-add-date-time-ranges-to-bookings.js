'use strict';

/**
 * Migration: Add `startDate`, `endDate`, `startTime`, and `endTime` columns to `bookings` table.
 * Supports date ranges (where endDate can equal startDate for single-day services)
 * and time intervals (startTime to endTime).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('bookings');

    if (!table.startDate) {
      await queryInterface.addColumn('bookings', 'startDate', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Booking start date (YYYY-MM-DD)',
      });
    }

    if (!table.endDate) {
      await queryInterface.addColumn('bookings', 'endDate', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Booking end date (YYYY-MM-DD, can equal startDate for single-day services)',
      });
    }

    if (!table.startTime) {
      await queryInterface.addColumn('bookings', 'startTime', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Booking start time slot (e.g. 9:00 AM)',
      });
    }

    if (!table.endTime) {
      await queryInterface.addColumn('bookings', 'endTime', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Booking end time slot (e.g. 5:00 PM)',
      });
    }

    // Backfill existing rows with date & time
    try {
      await queryInterface.sequelize.query(`
        UPDATE \`bookings\`
        SET \`startDate\` = COALESCE(\`startDate\`, \`date\`),
            \`endDate\` = COALESCE(\`endDate\`, \`date\`),
            \`startTime\` = COALESCE(\`startTime\`, \`time\`)
        WHERE \`startDate\` IS NULL OR \`endDate\` IS NULL;
      `);
    } catch (_) {}
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('bookings');
    if (table.endTime) await queryInterface.removeColumn('bookings', 'endTime');
    if (table.startTime) await queryInterface.removeColumn('bookings', 'startTime');
    if (table.endDate) await queryInterface.removeColumn('bookings', 'endDate');
    if (table.startDate) await queryInterface.removeColumn('bookings', 'startDate');
  },
};
