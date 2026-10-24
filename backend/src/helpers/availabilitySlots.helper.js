/**
 * Staff Availability Slots Helper
 * Provides robust parsing, normalization, and merging for staff calendar availability slots.
 *
 * Supports single date or multi-date definitions:
 * - date: "27-10-2026", slots: ["06:00 AM -- 08:00 AM", "02:00 PM--09:00 PM"]
 * - date: "2026-10-27", slots: [{ startTime: "06:00 AM", endTime: "08:00 AM" }, ...]
 * - availabilitySlots: [{ date: "27-10-2026", slots: [...] }, { date: "28-10-2026", slots: [...] }]
 */

/**
 * Normalizes date strings (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD) to ISO format (YYYY-MM-DD)
 * @param {string} rawDate
 * @returns {string} ISO Date (YYYY-MM-DD) or trimmed string
 */
function normalizeDateStr(rawDate) {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
}

/**
 * Converts ISO format YYYY-MM-DD to display format DD-MM-YYYY
 * @param {string} isoDate
 * @returns {string} DD-MM-YYYY or original string
 */
function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const parts = String(isoDate).trim().split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDate;
}

/**
 * Normalizes a single time slot (string or object)
 * Examples supported:
 * - "06:00 AM -- 08:00 AM"
 * - "06:00 AM - 08:00 AM"
 * - "06:00 AM to 08:00 AM"
 * - { startTime: "06:00 AM", endTime: "08:00 AM" }
 * - { start: "06:00 AM", end: "08:00 AM" }
 * - { time: "06:00 AM - 08:00 AM" }
 *
 * @param {string|object} slot
 * @returns {{ startTime: string, endTime: string, time: string } | null}
 */
function normalizeTimeSlot(slot) {
  if (!slot) return null;
  let startTime = '';
  let endTime = '';

  if (typeof slot === 'string') {
    const cleanSlot = slot.trim();
    if (!cleanSlot) return null;
    const parts = cleanSlot.split(/--|[-–—]|(?:\s+to\s+)/i).map((p) => p.trim());
    if (parts.length >= 2) {
      startTime = parts[0];
      endTime = parts[1];
    } else if (parts.length === 1 && parts[0]) {
      startTime = parts[0];
    }
  } else if (typeof slot === 'object') {
    startTime = String(slot.startTime || slot.start || slot.from || '').trim();
    endTime = String(slot.endTime || slot.end || slot.to || '').trim();
    if (!startTime && slot.time && typeof slot.time === 'string') {
      const parts = slot.time.split(/--|[-–—]|(?:\s+to\s+)/i).map((p) => p.trim());
      if (parts.length >= 2) {
        startTime = parts[0];
        endTime = parts[1];
      } else {
        startTime = parts[0];
      }
    }
  }

  if (!startTime && !endTime) return null;

  const time = startTime && endTime ? `${startTime} - ${endTime}` : (startTime || endTime);

  return {
    startTime: startTime || '',
    endTime: endTime || '',
    time,
  };
}

/**
 * Normalizes raw slots input (can be array of strings, array of objects, or comma-separated string)
 * @param {any} rawSlots
 * @returns {Array<{ startTime: string, endTime: string, time: string }>}
 */
function normalizeSlotsArray(rawSlots) {
  if (!rawSlots) return [];
  let list = rawSlots;

  if (typeof rawSlots === 'string') {
    const trimmed = rawSlots.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        list = JSON.parse(trimmed);
      } catch (_) {
        list = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else {
      list = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(list)) {
    list = [list];
  }

  return list
    .map(normalizeTimeSlot)
    .filter(Boolean);
}

/**
 * Checks whether an incoming payload has any slot information
 * @param {object} body
 * @returns {boolean}
 */
function hasAvailabilitySlotsInput(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.availabilitySlots !== undefined) return true;
  if (body.replaceSlots !== undefined) return true;
  if ((body.date || body.selectedDate) && (body.slots !== undefined || body.timeSlots !== undefined)) {
    return true;
  }
  if (Array.isArray(body.dates) && (body.slots !== undefined || body.timeSlots !== undefined)) {
    return true;
  }
  if (Array.isArray(body.slots) && body.slots.some((x) => x && typeof x === 'object' && x.date)) {
    return true;
  }
  if (Array.isArray(body.availability) && body.availability.some((x) => x && typeof x === 'object' && x.date)) {
    return true;
  }
  return false;
}

/**
 * Core processor for availability slots updates.
 *
 * Intelligently merges incoming slots with existing slots unless options.replace is true.
 *
 * @param {object} body Request body
 * @param {Array|string} existingSlots Existing staff.availabilitySlots from DB
 * @param {object} options Optional flags ({ replace: boolean })
 * @returns {Array<{ date: string, displayDate: string, slots: Array<{ startTime: string, endTime: string, time: string }> }>}
 */
function processStaffAvailabilitySlots(body, existingSlots = [], options = {}) {
  const shouldReplace = Boolean(
    options.replace === true ||
    body?.replaceSlots === true ||
    body?.clearExistingSlots === true
  );

  const dateMap = new Map();

  let existingArray = [];
  if (Array.isArray(existingSlots)) {
    existingArray = existingSlots;
  } else if (typeof existingSlots === 'string') {
    try {
      existingArray = JSON.parse(existingSlots);
    } catch (_) {
      existingArray = [];
    }
  }

  if (!shouldReplace) {
    for (const item of existingArray) {
      if (item && item.date) {
        const normDate = normalizeDateStr(item.date);
        if (normDate) {
          const slots = normalizeSlotsArray(item.slots || item.timeSlots);
          if (slots.length > 0) {
            dateMap.set(normDate, slots);
          }
        }
      }
    }
  }

  let incomingDatesData = [];

  // Source A: explicit availabilitySlots
  if (body?.availabilitySlots !== undefined) {
    let raw = body.availabilitySlots;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (_) {}
    }
    if (Array.isArray(raw)) {
      incomingDatesData.push(...raw);
    } else if (typeof raw === 'object' && raw !== null) {
      for (const [k, v] of Object.entries(raw)) {
        incomingDatesData.push({ date: k, slots: v });
      }
    }
  }

  // Source B: body.slots as an array of date objects
  if (body?.slots !== undefined && Array.isArray(body.slots)) {
    const hasDateObjects = body.slots.some((item) => item && typeof item === 'object' && item.date);
    if (hasDateObjects) {
      incomingDatesData.push(...body.slots);
    }
  }

  // Source C: Single date or array of dates with slots
  // e.g. { date: "27-10-2026", slots: ["06:00 AM -- 08:00 AM", "02:00 PM--09:00 PM"] }
  const singleDate = body?.date || body?.selectedDate;
  const multipleDates = body?.dates;
  const directSlots = body?.slots !== undefined ? body.slots : body?.timeSlots;

  if (singleDate && directSlots !== undefined) {
    incomingDatesData.push({
      date: singleDate,
      slots: directSlots,
    });
  }

  if (Array.isArray(multipleDates) && directSlots !== undefined) {
    for (const d of multipleDates) {
      incomingDatesData.push({
        date: d,
        slots: directSlots,
      });
    }
  }

  // Source D: body.availability contains date slot objects
  if (Array.isArray(body?.availability)) {
    const dateBased = body.availability.filter((x) => x && typeof x === 'object' && x.date);
    if (dateBased.length > 0) {
      incomingDatesData.push(...dateBased);
    }
  }

  // Process all incoming date entries
  for (const entry of incomingDatesData) {
    if (!entry) continue;
    const rawDate = entry.date;
    const normDate = normalizeDateStr(rawDate);
    if (!normDate) continue;

    const rawSlotList = entry.slots !== undefined ? entry.slots : entry.timeSlots;

    // Explicit empty array removes date from availability
    if (Array.isArray(rawSlotList) && rawSlotList.length === 0) {
      dateMap.delete(normDate);
      continue;
    }

    const normalizedSlots = normalizeSlotsArray(rawSlotList);
    if (normalizedSlots.length > 0) {
      dateMap.set(normDate, normalizedSlots);
    } else {
      dateMap.delete(normDate);
    }
  }

  // Format into sorted, clean array
  const formattedSlots = Array.from(dateMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, slots]) => ({
      date,
      displayDate: formatDisplayDate(date),
      slots,
    }));

  return formattedSlots;
}

module.exports = {
  normalizeDateStr,
  formatDisplayDate,
  normalizeTimeSlot,
  normalizeSlotsArray,
  hasAvailabilitySlotsInput,
  processStaffAvailabilitySlots,
};
