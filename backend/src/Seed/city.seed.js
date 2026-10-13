require('dotenv').config();
const { sequelize, City } = require('../database/models');

/**
 * Seed initial cities matching Eldoria DEFAULT_CITIES and live Care Desk numbers
 * Run standalone: `node src/Seed/city.seed.js`
 */
const seedCities = async () => {
  try {
    await sequelize.authenticate();

    const count = await City.count();
    if (count > 0) {
      console.log(`ℹ️ Cities already seeded (count: ${count}).`);
      return;
    }

    console.log('Seeding initial cities...');
    const initialCities = [
      {
        cityId: 'mumbai',
        name: 'Mumbai',
        order: 1,
        phone: '9820012345',
        whatsapp: '9820012345',
        isLive: true,
        hidden: false
      },
      {
        cityId: 'thane',
        name: 'Thane',
        order: 2,
        phone: '9820012345',
        whatsapp: '9820012345',
        isLive: true,
        hidden: false
      },
      {
        cityId: 'navi-mumbai',
        name: 'Navi Mumbai',
        order: 3,
        phone: '',
        whatsapp: '',
        isLive: true,
        hidden: false
      },
      {
        cityId: 'pune',
        name: 'Pune',
        order: 4,
        phone: '9822012345',
        whatsapp: '9822012345',
        isLive: true,
        hidden: false
      },
      {
        cityId: 'nashik',
        name: 'Nashik',
        order: 5,
        phone: '',
        whatsapp: '',
        isLive: false,
        hidden: true
      },
      {
        cityId: 'nagpur',
        name: 'Nagpur',
        order: 6,
        phone: '',
        whatsapp: '',
        isLive: false,
        hidden: true
      },
      {
        cityId: 'delhi',
        name: 'Delhi',
        order: 7,
        phone: '',
        whatsapp: '',
        isLive: false,
        hidden: true
      },
      {
        cityId: 'bengaluru',
        name: 'Bengaluru',
        order: 10,
        phone: '',
        whatsapp: '',
        isLive: false,
        hidden: true
      }
    ];

    await City.bulkCreate(initialCities);
    console.log(`✅ Seeded ${initialCities.length} initial cities.`);
  } catch (error) {
    console.error('❌ Failed to seed cities:', error.message);
  } finally {
    if (require.main === module) {
      await sequelize.close();
      process.exit(0);
    }
  }
};

if (require.main === module) {
  seedCities();
}

module.exports = seedCities;
