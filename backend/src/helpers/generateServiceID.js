const { Op } = require("sequelize");

/**
 * Generate a unique Service Code based on rule:
 * ELD{service category initial}{added date}{service type initial}{4 digit of serial numbers}
 *
 * Example:
 * - Category: "Elder Care" -> 'E'
 * - Added Date: 2026-10-15 -> '20261015'
 * - Type: "Care" -> 'C'
 * - Serial: 0001
 * Result: ELDE20261015C0001
 *
 * @param {string|object} categoryOrOptions - Service category string or options object
 * @param {string} serviceType - Service kind/type (e.g. 'care', 'equipment', 'doctor')
 * @param {Date|string|null} addedDate - Date of addition (defaults to current date YYYYMMDD)
 * @param {object|null} transaction - Optional Sequelize transaction
 * @returns {Promise<string>} Generated unique service code
 */
const generateServiceCode = async (
  categoryOrOptions = "",
  serviceType = "care",
  addedDate = null,
  transaction = null
) => {
  // Lazy require to avoid circular dependencies
  const { Service } = require("../database/models");

  let category = categoryOrOptions;
  let type = serviceType;
  let date = addedDate;
  let tx = transaction;

  // Support options object signature: generateServiceCode({ category, type, addedDate, transaction })
  if (
    typeof categoryOrOptions === "object" &&
    categoryOrOptions !== null &&
    !(categoryOrOptions instanceof Date)
  ) {
    category =
      categoryOrOptions.category ||
      categoryOrOptions.categoryName ||
      categoryOrOptions.categoryId ||
      "";
    type =
      categoryOrOptions.type ||
      categoryOrOptions.kind ||
      categoryOrOptions.serviceType ||
      "care";
    date = categoryOrOptions.addedDate || categoryOrOptions.date || null;
    tx = categoryOrOptions.transaction || null;
  } else if (categoryOrOptions instanceof Date) {
    date = categoryOrOptions;
    category = "";
  }

  // 1. Service Category Initial (fallback 'G' for General)
  const categoryInitial =
    (category || "G").trim().charAt(0).toUpperCase() || "G";

  // 2. Added Date in YYYYMMDD format
  const d = date ? new Date(date) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const yyyy = validDate.getFullYear().toString();
  const mm = String(validDate.getMonth() + 1).padStart(2, "0");
  const dd = String(validDate.getDate()).padStart(2, "0");
  const dateString = `${yyyy}${mm}${dd}`;

  // 3. Service Type Initial (fallback 'C' for Care)
  const typeInitial = (type || "C").trim().charAt(0).toUpperCase() || "C";

  // 4. Construct Prefix: ELD{catInitial}{addedDate}{typeInitial}
  const prefix = `ELD${categoryInitial}${dateString}${typeInitial}`;

  let nextSerial = 1;
  try {
    const lastService = await Service.findOne({
      where: {
        code: {
          [Op.like]: `${prefix}%`,
        },
      },
      order: [["code", "DESC"]],
      transaction: tx,
    });

    if (lastService && lastService.code) {
      const lastDigits = lastService.code.slice(-4);
      const parsed = parseInt(lastDigits, 10);
      if (!isNaN(parsed)) {
        nextSerial = parsed + 1;
      }
    }
  } catch {
    nextSerial = 1;
  }

  let serialString = String(nextSerial).padStart(4, "0");
  let candidateCode = `${prefix}${serialString}`;

  // Collision safety check
  let collision = await Service.findOne({
    where: { code: candidateCode },
    transaction: tx,
  });
  while (collision) {
    nextSerial += 1;
    serialString = String(nextSerial).padStart(4, "0");
    candidateCode = `${prefix}${serialString}`;
    collision = await Service.findOne({
      where: { code: candidateCode },
      transaction: tx,
    });
  }

  return candidateCode;
};

module.exports = {
  generateServiceCode,
  generateServiceId: generateServiceCode,
};
