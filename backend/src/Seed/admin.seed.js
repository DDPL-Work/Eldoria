require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize, Admin } = require("../database/models");

/**
 * Seed initial Admin Admin
 * Can be run standalone: `node src/Seed/admin.seed.js`
 */
const seedAdmin = async () => {
  try {
    await sequelize.authenticate();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASS;
    const adminName = process.env.ADMIN_NAME;
    const adminPhone = process.env.ADMIN_PHONE;

    const existingAdmin = await Admin.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      console.log(`ℹ️ Admin already exists with email: ${adminEmail}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(String(adminPassword), 10);

    const admin = await Admin.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      phone: adminPhone,
      isActive: true,
    });

    console.log(`✅ Admin seeded successfully:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
  } catch (error) {
    console.error("❌ Failed to seed admin:", error.message);
  } finally {
    if (require.main === module) {
      await sequelize.close();
      process.exit(0);
    }
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
