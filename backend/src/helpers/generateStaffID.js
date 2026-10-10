const { Op } = require("sequelize");
const { User, Staff } = require("../database/models");

/**
 * Generate a unique Staff ID based on specified rule:
 * ELDO{last two digits of year}{city initial}{first letter of gender}{4 digit serial}
 * Example: ELDO26MF0001 (Eldoria, 2026, Mumbai, Female, Serial 0001)
 *
 */
const generateStaffId = async (city = "", gender = "", transaction = null) => {
  const currentYear = new Date().getFullYear().toString().slice(-2); // e.g. '26'
  const cityInitial = (city || "X").trim().charAt(0).toUpperCase(); // e.g. 'M'
  const genderInitial = (gender || "O").trim().charAt(0).toUpperCase(); // 'M', 'F', 'O'

  const prefix = `ELDOSF${currentYear}${cityInitial}${genderInitial}`;

  let nextSerial = 1;
  try {
    const lastStaff = await Staff.findOne({
      where: {
        staffId: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [["staffId", "DESC"]],
      transaction,
    });

    if (lastStaff && lastStaff.staffId) {
      const lastDigits = lastStaff.staffId.slice(-4);
      const parsed = parseInt(lastDigits, 10);
      if (!isNaN(parsed)) {
        nextSerial = parsed + 1;
      }
    }
  } catch {
    nextSerial = 1;
  }

  let serialString = String(nextSerial).padStart(4, "0");
  let candidateId = `${prefix}${serialString}`;

  // Collision safety check across users table
  let collision = await User.findOne({
    where: { staffId: candidateId },
    transaction,
  });
  while (collision) {
    nextSerial += 1;
    serialString = String(nextSerial).padStart(4, "0");
    candidateId = `${prefix}${serialString}`;
    collision = await User.findOne({
      where: { staffId: candidateId },
      transaction,
    });
  }

  return candidateId;
};

module.exports = {
  generateStaffId,
};
