const { Op } = require("sequelize");
const { Client } = require("../database/models");

/**
 * Generate a unique Client ID based on rule:
 * ELDOCL{last two digits of year}{city initial}{4 digit serial}
 * Example: ELDOCL26M0001 (Eldoria Client, 2026, Mumbai, Serial 0001)
 */
const generateClientId = async (city = "", transaction = null) => {
  const currentYear = new Date().getFullYear().toString().slice(-2); // e.g. '26'
  const cityInitial = (city || "X").trim().charAt(0).toUpperCase(); // e.g. 'M'

  const prefix = `ELDOCL${currentYear}${cityInitial}`;

  let nextSerial = 1;
  try {
    const lastClient = await Client.findOne({
      where: {
        clientId: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [["clientId", "DESC"]],
      transaction,
    });

    if (lastClient && lastClient.clientId) {
      const lastDigits = lastClient.clientId.slice(-4);
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

  // Collision safety check
  let collision = await Client.findOne({
    where: { clientId: candidateId },
    transaction,
  });
  while (collision) {
    nextSerial += 1;
    serialString = String(nextSerial).padStart(4, "0");
    candidateId = `${prefix}${serialString}`;
    collision = await Client.findOne({
      where: { clientId: candidateId },
      transaction,
    });
  }

  return candidateId;
};

module.exports = {
  generateClientId,
};
