const { Op } = require("sequelize");
const { Enquiry } = require("../database/models");

/**
 * Generate a unique Enquiry ID based on rule:
 * ELDEN{client name initial}{city initial}{year}{4 digit serial number}
 * Example: ELDENPM260001 (Eldoria Enquiry, Client Priya, Mumbai, 2026, Serial 0001)
 *
 * @param {string} clientName - Name of the client inquiring for care
 * @param {string} city - City where the enquiry originates
 * @param {object|null} transaction - Optional Sequelize transaction
 * @returns {Promise<string>} Generated unique enquiry ID (code)
 */
const generateEnquiryId = async (clientName = "", city = "", transaction = null) => {
  const clientInitial = (clientName || "C").trim().charAt(0).toUpperCase() || "C";
  const cityInitial = (city || "X").trim().charAt(0).toUpperCase() || "X";
  const currentYear = new Date().getFullYear().toString().slice(-2); // e.g. '26'

  const prefix = `ELDEN${clientInitial}${cityInitial}${currentYear}`;

  let nextSerial = 1;
  try {
    const lastEnquiry = await Enquiry.findOne({
      where: {
        code: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [["code", "DESC"]],
      transaction,
    });

    if (lastEnquiry && lastEnquiry.code) {
      const lastDigits = lastEnquiry.code.slice(-4);
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
  let collision = await Enquiry.findOne({
    where: { code: candidateId },
    transaction,
  });
  while (collision) {
    nextSerial += 1;
    serialString = String(nextSerial).padStart(4, "0");
    candidateId = `${prefix}${serialString}`;
    collision = await Enquiry.findOne({
      where: { code: candidateId },
      transaction,
    });
  }

  return candidateId;
};

module.exports = {
  generateEnquiryId,
};
