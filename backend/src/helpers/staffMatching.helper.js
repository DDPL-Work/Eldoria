/**
 * Staff Matching and Area Distance Proximity Helper
 * Provides pixel-perfect matching for home care bookings based on:
 * 1. City match
 * 2. Exact Area & Proximity Distance (Haversine formula + coordinates)
 * 3. Expanded Search Area (+10 km radius via increaseArea flag)
 * 4. Service, Category, Tasks, Skills & Qualification compatibility
 * 5. Availability, On-Duty status, and Experience ranking
 */

// Comprehensive Coordinates Dictionary (latitude, longitude) for localities
const AREA_COORDINATES = {
  // Mumbai Western Suburbs
  "andheri": { lat: 19.1136, lon: 72.8697 },
  "andheri west": { lat: 19.1363, lon: 72.8277 },
  "andheri east": { lat: 19.1158, lon: 72.8544 },
  "versova": { lat: 19.1351, lon: 72.8146 },
  "lokhandwala": { lat: 19.1419, lon: 72.8258 },
  "oshiwara": { lat: 19.1478, lon: 72.8315 },
  "juhu": { lat: 19.1075, lon: 72.8263 },
  "vile parle": { lat: 19.0997, lon: 72.8438 },
  "vile parle west": { lat: 19.1025, lon: 72.8361 },
  "vile parle east": { lat: 19.0968, lon: 72.8515 },
  "santacruz": { lat: 19.0843, lon: 72.8360 },
  "santacruz west": { lat: 19.0819, lon: 72.8310 },
  "santacruz east": { lat: 19.0833, lon: 72.8530 },
  "khar": { lat: 19.0700, lon: 72.8338 },
  "khar west": { lat: 19.0689, lon: 72.8322 },
  "bandra": { lat: 19.0596, lon: 72.8295 },
  "bandra west": { lat: 19.0544, lon: 72.8267 },
  "bandra east": { lat: 19.0607, lon: 72.8515 },
  "jogeshwari": { lat: 19.1311, lon: 72.8465 },
  "jogeshwari west": { lat: 19.1383, lon: 72.8378 },
  "jogeshwari east": { lat: 19.1284, lon: 72.8580 },
  "goregaon": { lat: 19.1663, lon: 72.8526 },
  "goregaon west": { lat: 19.1611, lon: 72.8397 },
  "goregaon east": { lat: 19.1692, lon: 72.8617 },
  "malad": { lat: 19.1874, lon: 72.8484 },
  "malad west": { lat: 19.1828, lon: 72.8344 },
  "malad east": { lat: 19.1856, lon: 72.8596 },
  "kandivali": { lat: 19.2045, lon: 72.8522 },
  "kandivali west": { lat: 19.2062, lon: 72.8383 },
  "kandivali east": { lat: 19.2069, lon: 72.8675 },
  "borivali": { lat: 19.2307, lon: 72.8567 },
  "borivali west": { lat: 19.2319, lon: 72.8436 },
  "borivali east": { lat: 19.2288, lon: 72.8640 },
  "dahisar": { lat: 19.2501, lon: 72.8593 },
  "mira road": { lat: 19.2812, lon: 72.8561 },
  "bhayandar": { lat: 19.3006, lon: 72.8528 },

  // Mumbai South & Central
  "mahim": { lat: 19.0354, lon: 72.8404 },
  "dadar": { lat: 19.0178, lon: 72.8478 },
  "dadar west": { lat: 19.0222, lon: 72.8397 },
  "dadar east": { lat: 19.0189, lon: 72.8494 },
  "matunga": { lat: 19.0269, lon: 72.8553 },
  "prabhadevi": { lat: 19.0144, lon: 72.8278 },
  "worli": { lat: 19.0166, lon: 72.8175 },
  "lower parel": { lat: 18.9953, lon: 72.8301 },
  "parel": { lat: 19.0094, lon: 72.8377 },
  "byculla": { lat: 18.9750, lon: 72.8295 },
  "mumbai central": { lat: 18.9690, lon: 72.8193 },
  "tardeo": { lat: 18.9712, lon: 72.8130 },
  "grant road": { lat: 18.9633, lon: 72.8159 },
  "girgaon": { lat: 18.9558, lon: 72.8188 },
  "marine lines": { lat: 18.9447, lon: 72.8242 },
  "churchgate": { lat: 18.9322, lon: 72.8264 },
  "fort": { lat: 18.9322, lon: 72.8347 },
  "colaba": { lat: 18.9067, lon: 72.8147 },
  "cuffe parade": { lat: 18.9130, lon: 72.8190 },
  "nariman point": { lat: 18.9256, lon: 72.8242 },

  // Mumbai Eastern Suburbs
  "kurla": { lat: 19.0726, lon: 72.8845 },
  "kurla west": { lat: 19.0683, lon: 72.8753 },
  "kurla east": { lat: 19.0637, lon: 72.8906 },
  "chembur": { lat: 19.0522, lon: 72.8994 },
  "chembur east": { lat: 19.0600, lon: 72.9050 },
  "chembur west": { lat: 19.0550, lon: 72.8950 },
  "ghatkopar": { lat: 19.0860, lon: 72.9080 },
  "ghatkopar west": { lat: 19.0917, lon: 72.9011 },
  "ghatkopar east": { lat: 19.0833, lon: 72.9142 },
  "vidyavihar": { lat: 19.0798, lon: 72.8973 },
  "vikhroli": { lat: 19.1111, lon: 72.9277 },
  "kanjurmarg": { lat: 19.1300, lon: 72.9325 },
  "bhandup": { lat: 19.1450, lon: 72.9378 },
  "mulund": { lat: 19.1726, lon: 72.9565 },
  "mulund west": { lat: 19.1750, lon: 72.9450 },
  "mulund east": { lat: 19.1680, lon: 72.9600 },
  "sion": { lat: 19.0434, lon: 72.8634 },
  "wadala": { lat: 19.0176, lon: 72.8561 },
  "govandi": { lat: 19.0553, lon: 72.9150 },
  "mankhurd": { lat: 19.0494, lon: 72.9325 },
  "powai": { lat: 19.1197, lon: 72.9051 },
  "chandivali": { lat: 19.1128, lon: 72.8931 },

  // Thane District
  "thane": { lat: 19.2183, lon: 72.9781 },
  "thane west": { lat: 19.2056, lon: 72.9667 },
  "thane east": { lat: 19.1867, lon: 72.9756 },
  "ghodbunder road": { lat: 19.2689, lon: 72.9317 },
  "majiwada": { lat: 19.2133, lon: 72.9844 },
  "naupada": { lat: 19.1917, lon: 72.9708 },
  "vartak nagar": { lat: 19.2100, lon: 72.9550 },
  "wagle estate": { lat: 19.1950, lon: 72.9467 },
  "kasarvadavali": { lat: 19.2733, lon: 72.9617 },
  "kalwa": { lat: 19.1967, lon: 72.9967 },
  "mumbra": { lat: 19.1783, lon: 73.0183 },
  "dombivli": { lat: 19.2183, lon: 73.0867 },
  "kalyan": { lat: 19.2437, lon: 73.1355 },

  // Navi Mumbai
  "vashi": { lat: 19.0771, lon: 72.9986 },
  "sanpada": { lat: 19.0667, lon: 73.0117 },
  "nerul": { lat: 19.0330, lon: 73.0197 },
  "seawoods": { lat: 19.0183, lon: 73.0150 },
  "belapur": { lat: 19.0200, lon: 73.0400 },
  "cbd belapur": { lat: 19.0156, lon: 73.0397 },
  "kharghar": { lat: 19.0433, lon: 73.0650 },
  "panvel": { lat: 18.9894, lon: 73.1175 },
  "airoli": { lat: 19.1558, lon: 72.9986 },
  "ghansoli": { lat: 19.1233, lon: 73.0083 },
  "kopar khairane": { lat: 19.1033, lon: 73.0067 },

  // Pune
  "kothrud": { lat: 18.5074, lon: 73.8077 },
  "baner": { lat: 18.5590, lon: 73.7868 },
  "aundh": { lat: 18.5580, lon: 73.8073 },
  "hinjewadi": { lat: 18.5913, lon: 73.7389 },
  "wakad": { lat: 18.5987, lon: 73.7687 },
  "viman nagar": { lat: 18.5679, lon: 73.9143 },
  "kalyani nagar": { lat: 18.5463, lon: 73.9034 },
  "koregaon park": { lat: 18.5362, lon: 73.8940 },
  "hadapsar": { lat: 18.5089, lon: 73.9259 },
  "shivaji nagar": { lat: 18.5314, lon: 73.8446 },
};

/**
 * Standardize text string for uniform token matching
 */
const cleanString = (val) => {
  if (!val) return "";
  return String(val)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ");
};

/**
 * Split area string into distinct locality tokens
 * e.g. "Andheri, Versova" -> ["andheri", "versova"]
 */
const parseAreaList = (areaInput) => {
  if (!areaInput) return [];
  if (Array.isArray(areaInput)) {
    return areaInput.flatMap((a) => parseAreaList(a));
  }
  return String(areaInput)
    .split(/[,;/|&]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Extract skills as a clean list of lower-case strings
 */
const normalizeSkillsList = (skills) => {
  if (!skills) return [];
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) return normalizeSkillsList(parsed);
    } catch (_) {}
    return skills
      .split(/[,;/]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  if (Array.isArray(skills)) {
    return skills.flatMap((item) => {
      if (typeof item === "string") {
        return item
          .split(/[,;/]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      }
      return [];
    });
  }
  return [];
};

/**
 * Calculate distance between two lat/lon coordinates in kilometers using Haversine formula
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null
  ) {
    return null;
  }
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
};

/**
 * Resolve coordinates for an area string from the coordinates table
 */
const findCoordinatesForArea = (rawArea) => {
  if (!rawArea) return null;
  const cleaned = cleanString(rawArea);

  // 1. Direct exact key match
  if (AREA_COORDINATES[cleaned]) {
    return AREA_COORDINATES[cleaned];
  }

  // 2. Check each known coordinate key as substring
  const keys = Object.keys(AREA_COORDINATES);
  for (const k of keys) {
    if (cleaned === k || cleaned.includes(k) || k.includes(cleaned)) {
      return AREA_COORDINATES[k];
    }
  }

  // 3. Match individual words (e.g. "andheri" from "andheri west rd")
  const tokens = cleaned.split(" ").filter((t) => t.length > 3);
  for (const t of tokens) {
    for (const k of keys) {
      if (k === t || k.startsWith(t + " ")) {
        return AREA_COORDINATES[k];
      }
    }
  }

  return null;
};

/**
 * Evaluate proximity between booking area and staff operating area
 */
const evaluateAreaProximity = (bookingArea, staffArea, city) => {
  const bAreaClean = cleanString(bookingArea);
  const staffAreas = parseAreaList(staffArea);

  // 1. Check exact token/substring match first
  let isExactArea = false;
  for (const sA of staffAreas) {
    const sClean = cleanString(sA);
    if (!sClean || !bAreaClean) continue;
    if (
      sClean === bAreaClean ||
      sClean.includes(bAreaClean) ||
      bAreaClean.includes(sClean)
    ) {
      isExactArea = true;
      break;
    }
    // Also check token level overlap (e.g. "versova" in both)
    const bTokens = bAreaClean.split(" ").filter((t) => t.length > 3);
    const sTokens = sClean.split(" ").filter((t) => t.length > 3);
    const hasCommonToken = bTokens.some((bt) => sTokens.includes(bt));
    if (hasCommonToken) {
      isExactArea = true;
      break;
    }
  }

  if (isExactArea) {
    return {
      isExactArea: true,
      distanceKm: 0.0,
      isWithin10Km: true,
      matchTier: "exact_area",
    };
  }

  // 2. Calculate geographic distance using coordinates
  const bCoords = findCoordinatesForArea(bookingArea);
  let minDistance = null;

  if (bCoords) {
    for (const sA of staffAreas) {
      const sCoords = findCoordinatesForArea(sA);
      if (sCoords) {
        const d = calculateDistanceKm(bCoords.lat, bCoords.lon, sCoords.lat, sCoords.lon);
        if (d !== null && (minDistance === null || d < minDistance)) {
          minDistance = d;
        }
      }
    }
  }

  // If distance could be calculated
  if (minDistance !== null) {
    // 10 km radius with a subtle 0.5 km buffer for area boundary tolerance
    const isWithin10Km = minDistance <= 10.5;
    return {
      isExactArea: false,
      distanceKm: minDistance,
      isWithin10Km,
      matchTier: isWithin10Km ? "nearby_10km" : "same_city",
    };
  }

  // 3. Fallback when coordinates are unknown: same city but distance unknown
  return {
    isExactArea: false,
    distanceKm: null,
    isWithin10Km: false,
    matchTier: "same_city",
  };
};

/**
 * Service & Skill Compatibility Rules Matrix
 * Maps Eldoria services, categories, and medical care requirements to staff skills & roles
 */
const SERVICE_COMPATIBILITY_RULES = {
  // Physiotherapy & Rehabilitation
  physiotherapy: {
    serviceKeywords: [
      "physio",
      "physiotherapy",
      "elderphysio",
      "postsurgphysio",
      "strokerehab",
      "rehab",
      "paralysis",
      "mobility",
    ],
    requiredRoles: [
      "physiotherapist",
      "physiotherapist (bpt)",
      "bpt",
      "mpt",
      "rehab specialist",
    ],
    matchingSkills: [
      "post-stroke",
      "ortho rehab",
      "neuro rehab",
      "mobility exercises",
      "geriatric care",
      "stroke rehabilitation",
      "physiotherapy",
      "rehab",
      "exercise therapy",
    ],
  },

  // Nursing & Clinical Procedures
  nursing: {
    serviceKeywords: [
      "nursing",
      "generalnursing",
      "icu",
      "medication",
      "injection",
      "wound",
      "catheter",
      "ryles",
      "vitals",
      "dressing",
      "infusion",
    ],
    requiredRoles: [
      "gnm nurse",
      "anm nurse",
      "b.sc nurse",
      "bsc nurse",
      "staff nurse",
      "nurse",
      "registered nurse",
      "icu nurse",
    ],
    matchingSkills: [
      "injection",
      "injections",
      "injections & iv",
      "iv",
      "diabetic care",
      "wound dressing",
      "wound care",
      "catheter",
      "catheter care",
      "catheter management",
      "ryles tube",
      "ryles tube care",
      "vital monitoring",
      "vital signs monitoring",
      "medication support",
      "icu care",
      "ventilator support",
      "tracheostomy care",
      "post-surgery",
      "post-surgery care",
    ],
  },

  // Senior Citizen, Elderly & Attendant Care
  elderly: {
    serviceKeywords: [
      "senior",
      "caregiver",
      "companion",
      "dementia",
      "bedridden",
      "posthosp",
      "daycare",
      "nightcare",
      "patientcg",
      "eldercg",
      "malecg",
      "femalecg",
      "care12",
      "attendant",
      "livein",
      "24-hour care",
    ],
    requiredRoles: [
      "caregiver",
      "attendant",
      "senior care assistant",
      "anm nurse",
      "gnm nurse",
      "nurse",
    ],
    matchingSkills: [
      "elderly care",
      "elder care",
      "geriatric care",
      "bedridden care",
      "personal hygiene",
      "mobility",
      "vital signs monitoring",
      "companionship",
      "dementia care",
      "alzheimer’s care",
      "feeding",
      "bathing",
      "diabetic care",
      "medication support",
    ],
  },

  // Post-Surgery & Specialized Care
  postsurgery: {
    serviceKeywords: [
      "postsurgery",
      "post-surgery",
      "stroke",
      "cancer",
      "palliative",
      "parkinsons",
      "alzheimers",
      "special",
    ],
    requiredRoles: [
      "gnm nurse",
      "b.sc nurse",
      "anm nurse",
      "physiotherapist",
    ],
    matchingSkills: [
      "post-surgery",
      "post-surgery care",
      "wound dressing",
      "catheter management",
      "post-stroke",
      "neuro rehab",
      "palliative care",
      "cancer care",
      "vital signs monitoring",
      "injections & iv",
    ],
  },

  // Doctor Consultations
  doctors: {
    serviceKeywords: ["consult", "nearby", "homedoctor", "doctor"],
    requiredRoles: ["doctor", "mbbs", "md", "physician"],
    matchingSkills: ["consultation", "medical diagnosis", "general medicine"],
  },
};

/**
 * Evaluate compatibility of a staff member against a booking's required service & tasks
 */
const evaluateServiceSkillMatch = (booking, staff) => {
  const reqService = cleanString(booking.service || booking.serviceId || "");
  const reqServiceName = cleanString(booking.serviceName || "");
  const reqCategory = cleanString(booking.category || booking.categoryId || "");
  const reqTasks = Array.isArray(booking.tasks)
    ? booking.tasks.map((t) => (typeof t === "string" ? cleanString(t) : cleanString(t?.label || "")))
    : [];

  const staffQual = cleanString(staff.qualification || "");
  const staffSkills = normalizeSkillsList(staff.skills);

  let isSkillMatch = false;
  let qualificationMatch = false;
  const matchedSkills = [];
  let scorePoints = 0;

  // 1. Direct text match between service and staff skills
  for (const skill of staffSkills) {
    if (
      reqService.includes(skill) ||
      skill.includes(reqService) ||
      reqServiceName.includes(skill) ||
      skill.includes(reqServiceName)
    ) {
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
      isSkillMatch = true;
      scorePoints += 30;
    }
  }

  // 2. Direct task match against staff skills
  for (const task of reqTasks) {
    for (const skill of staffSkills) {
      if (task.includes(skill) || skill.includes(task)) {
        if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
        isSkillMatch = true;
        scorePoints += 15;
      }
    }
  }

  // 3. Rule-based domain matching
  const rules = Object.values(SERVICE_COMPATIBILITY_RULES);
  for (const rule of rules) {
    const isServiceTarget =
      rule.serviceKeywords.some((kw) => reqService.includes(kw) || reqServiceName.includes(kw) || reqCategory.includes(kw));

    if (isServiceTarget) {
      // Check qualification match
      const roleMatches = rule.requiredRoles.some((role) => staffQual.includes(role) || role.includes(staffQual));
      if (roleMatches) {
        qualificationMatch = true;
        isSkillMatch = true;
        scorePoints += 35;
      }

      // Check domain skills
      for (const reqSkill of rule.matchingSkills) {
        const hasSkill = staffSkills.some((s) => s.includes(reqSkill) || reqSkill.includes(s));
        if (hasSkill) {
          isSkillMatch = true;
          if (!matchedSkills.includes(reqSkill)) matchedSkills.push(reqSkill);
          scorePoints += 15;
        }
      }
    }
  }

  // Default fallback: If booking is elderly/caregiver and staff is GNM/ANM nurse, they are qualified
  if (
    (reqService.includes("caregiver") || reqService.includes("senior") || reqService.includes("elder")) &&
    (staffQual.includes("nurse") || staffQual.includes("gnm") || staffQual.includes("anm"))
  ) {
    qualificationMatch = true;
    isSkillMatch = true;
    scorePoints += 30;
  }

  // Formulate human-friendly match reason
  let matchReason = "";
  if (isSkillMatch) {
    if (qualificationMatch && matchedSkills.length > 0) {
      matchReason = `Qualified ${staff.qualification} with matching skills: ${matchedSkills.slice(0, 3).join(", ")}`;
    } else if (qualificationMatch) {
      matchReason = `Qualified ${staff.qualification} for ${booking.serviceName || booking.service}`;
    } else if (matchedSkills.length > 0) {
      matchReason = `Provides matching skills: ${matchedSkills.slice(0, 3).join(", ")}`;
    } else {
      matchReason = `Compatible qualification for ${booking.serviceName || booking.service}`;
    }
  } else {
    matchReason = `Specialized in ${staff.qualification || "other care"}, available for general assignment`;
  }

  const skillScore = Math.min(100, Math.max(isSkillMatch ? 60 : 20, scorePoints));

  return {
    isSkillMatch,
    qualificationMatch,
    matchedSkills,
    matchReason,
    skillScore,
  };
};

/**
 * Score, filter, and rank staff members for a specific booking
 * @param {Object} booking - Booking database record
 * @param {Array} staffList - Array of staff database records with user association
 * @param {Object} options - Matching options ({ increaseArea, radius, includePending })
 */
const scoreAndRankStaffForBooking = (booking, staffList, options = {}) => {
  const {
    increaseArea = false,
    radius = 10,
    includePending = false,
  } = options;

  const effectiveRadiusKm = increaseArea ? Number(radius) || 10 : 0;
  const bookingCity = (booking.city || "mumbai").toLowerCase().trim();
  const bookingArea = booking.area || "";

  // Evaluate each staff member
  const scoredStaff = staffList.map((staffRecord) => {
    const s = staffRecord.toJSON ? staffRecord.toJSON() : { ...staffRecord };
    const staffCity = (s.city || "mumbai").toLowerCase().trim();
    const isSameCity = staffCity === bookingCity;

    // 1. Area proximity
    const proximity = isSameCity
      ? evaluateAreaProximity(bookingArea, s.area, bookingCity)
      : {
          isExactArea: false,
          distanceKm: null,
          isWithin10Km: false,
          matchTier: "other_city",
        };

    const isExactArea = proximity.isExactArea;
    const distanceKm = proximity.distanceKm;
    const isWithinRadius =
      isExactArea || (distanceKm !== null && distanceKm <= effectiveRadiusKm + 0.5);
    const isWithin10Km = proximity.isWithin10Km;

    // 2. Service & Skill match
    const skillEvaluation = evaluateServiceSkillMatch(booking, s);

    // 3. Composite score calculation (0 - 100)
    let totalScore = 0;

    // City factor
    if (!isSameCity) {
      totalScore = 15; // Low baseline for staff in another city
    } else {
      // Area factor (up to 35 pts)
      if (isExactArea) {
        totalScore += 35;
      } else if (distanceKm !== null) {
        if (distanceKm <= 3.0) totalScore += 32;
        else if (distanceKm <= 5.0) totalScore += 28;
        else if (distanceKm <= 10.0) totalScore += 22;
        else totalScore += 10;
      } else {
        totalScore += 12; // Same city, unknown distance
      }

      // Skill factor (up to 45 pts)
      if (skillEvaluation.isSkillMatch) {
        totalScore += 35;
        if (skillEvaluation.qualificationMatch) totalScore += 5;
        if (skillEvaluation.matchedSkills.length > 0) totalScore += 5;
      } else {
        totalScore += 10;
      }

      // On Duty factor (up to 15 pts)
      if (s.onDuty) {
        totalScore += 12;
      }

      // Experience factor (up to 5 pts)
      const expYears = parseInt(s.experience, 10);
      if (!isNaN(expYears) && expYears >= 3) {
        totalScore += 3;
      }
    }

    const matchScore = Math.min(100, Math.max(10, totalScore));

    // Distance Badge
    let distanceBadge = "City-wide";
    if (!isSameCity) {
      distanceBadge = `Other City (${s.city || "outside"})`;
    } else if (isExactArea) {
      distanceBadge = "Exact Area Match";
    } else if (distanceKm !== null) {
      distanceBadge = `~${distanceKm} km away`;
    }

    // Determine if candidate qualifies as best match
    const isBestCandidate =
      isSameCity &&
      skillEvaluation.isSkillMatch &&
      (isExactArea || (increaseArea && isWithinRadius));

    return {
      ...s,
      matchMeta: {
        matchScore,
        isSameCity,
        isExactArea,
        distanceKm,
        isWithin10Km,
        isWithinRadius,
        distanceBadge,
        isSkillMatch: skillEvaluation.isSkillMatch,
        qualificationMatch: skillEvaluation.qualificationMatch,
        matchedSkills: skillEvaluation.matchedSkills,
        matchReason: skillEvaluation.matchReason,
        areaMatchTier: proximity.matchTier,
        isBestCandidate,
      },
    };
  });

  // Group into transparent, pixel-perfect categories
  const approvedCandidates = scoredStaff.filter(
    (s) => s.approval === "approved" || includePending
  );

  // 1. Best Matches: Same city, matching service/skills, AND in exact area (or expanded area if increaseArea=true)
  const bestMatches = approvedCandidates
    .filter((s) => s.matchMeta.isBestCandidate)
    .sort((a, b) => {
      // Prioritize exact area > onDuty > distance > matchScore
      if (a.matchMeta.isExactArea !== b.matchMeta.isExactArea) {
        return a.matchMeta.isExactArea ? -1 : 1;
      }
      if (a.onDuty !== b.onDuty) {
        return a.onDuty ? -1 : 1;
      }
      if (a.matchMeta.distanceKm !== null && b.matchMeta.distanceKm !== null) {
        return a.matchMeta.distanceKm - b.matchMeta.distanceKm;
      }
      return b.matchMeta.matchScore - a.matchMeta.matchScore;
    });

  // 2. Nearby Matches (within 10 km expanded area, not exact area)
  const nearbyMatches = approvedCandidates
    .filter(
      (s) =>
        s.matchMeta.isSameCity &&
        !s.matchMeta.isExactArea &&
        s.matchMeta.isWithin10Km &&
        s.matchMeta.isSkillMatch
    )
    .sort((a, b) => (a.matchMeta.distanceKm || 99) - (b.matchMeta.distanceKm || 99));

  // 3. City-wide Service Matches: Same city, matching skills, but outside 10 km
  const cityMatches = approvedCandidates
    .filter(
      (s) =>
        s.matchMeta.isSameCity &&
        !s.matchMeta.isExactArea &&
        !s.matchMeta.isWithin10Km &&
        s.matchMeta.isSkillMatch
    )
    .sort((a, b) => b.matchMeta.matchScore - a.matchMeta.matchScore);

  // 4. Other staff in same city (different skill specialty or general caregivers)
  const otherLocalStaff = approvedCandidates
    .filter((s) => s.matchMeta.isSameCity && !s.matchMeta.isSkillMatch)
    .sort((a, b) => b.matchMeta.matchScore - a.matchMeta.matchScore);

  // 5. Other staff in different cities
  const otherCityStaff = approvedCandidates.filter((s) => !s.matchMeta.isSameCity);

  // Maintain backward compatibility lists
  const localStaff = approvedCandidates.filter((s) => s.matchMeta.isSameCity);
  const otherStaff = approvedCandidates.filter((s) => !s.matchMeta.isSameCity);

  return {
    bookingDetails: {
      id: booking.id,
      code: booking.code,
      patientName: booking.patientName,
      city: bookingCity,
      area: bookingArea,
      address: booking.address,
      service: booking.service,
      serviceName: booking.serviceName || booking.service,
      category: booking.category,
      date: booking.date,
      time: booking.time,
    },
    searchCriteria: {
      bookingCity,
      bookingArea,
      requiredService: booking.service,
      requiredServiceName: booking.serviceName || booking.service,
      increaseArea: Boolean(increaseArea),
      effectiveRadiusKm,
    },
    counts: {
      bestMatchesCount: bestMatches.length,
      nearbyMatchesCount: nearbyMatches.length,
      cityServiceMatchesCount: cityMatches.length,
      totalApprovedStaffInCity: localStaff.length,
      totalApprovedStaff: approvedCandidates.length,
    },
    matches: {
      bestMatches,
      nearbyMatches,
      cityMatches,
    },
  };
};

module.exports = {
  AREA_COORDINATES,
  calculateDistanceKm,
  findCoordinatesForArea,
  evaluateAreaProximity,
  evaluateServiceSkillMatch,
  scoreAndRankStaffForBooking,
  normalizeSkillsList,
  parseAreaList,
};
