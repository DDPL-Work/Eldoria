const { Op } = require("sequelize");
const { Booking } = require("../database/models");

/**
 * Generate a unique Booking ID based on rule:
 * ELDBO{client name initial}{city initial}{year}{4 digit serial number}
 * Example: ELDBOPM260001 (Eldoria Booking, Client Priya, Mumbai, 2026, Serial 0001)
 *
 * @param {string} clientName - Name of the client booking the care service
 * @param {string} city - City where the booking takes place
 * @param {object|null} transaction - Optional Sequelize transaction
 * @returns {Promise<string>} Generated unique booking ID (code)
 */
const generateBookingId = async (clientName = "", city = "", transaction = null) => {
  const clientInitial = (clientName || "C").trim().charAt(0).toUpperCase() || "C";
  const cityInitial = (city || "X").trim().charAt(0).toUpperCase() || "X";
  const currentYear = new Date().getFullYear().toString().slice(-2); // e.g. '26'

  const prefix = `ELDBO${clientInitial}${cityInitial}${currentYear}`;

  let nextSerial = 1;
  try {
    const lastBooking = await Booking.findOne({
      where: {
        code: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [["code", "DESC"]],
      transaction,
    });

    if (lastBooking && lastBooking.code) {
      const lastDigits = lastBooking.code.slice(-4);
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
  let collision = await Booking.findOne({
    where: { code: candidateId },
    transaction,
  });
  while (collision) {
    nextSerial += 1;
    serialString = String(nextSerial).padStart(4, "0");
    candidateId = `${prefix}${serialString}`;
    collision = await Booking.findOne({
      where: { code: candidateId },
      transaction,
    });
  }

  return candidateId;
};

module.exports = {
  generateBookingId,
};
