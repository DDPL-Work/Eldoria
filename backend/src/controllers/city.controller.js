const { Op } = require('sequelize');
const { City, Booking, Staff, sequelize } = require('../database/models');
const { successResponse, errorResponse } = require('../utills/responseHandler');

/**
 * Helper to build lookup condition by either numeric id or cityId slug
 */
const buildCityLookupCondition = (identifier) => {
  const isNumeric = !isNaN(Number(identifier));
  return isNumeric
    ? { [Op.or]: [{ id: Number(identifier) }, { cityId: String(identifier).trim().toLowerCase() }] }
    : { cityId: String(identifier).trim().toLowerCase() };
};

/**
 * Standardize phone / whatsapp numbers to 10 digits
 */
const normalizeDigits = (val = '') => {
  return String(val || '').replace(/\D/g, '').trim();
};

/**
 * Helper to slugify city name
 */
const slugifyCityName = (name = '') => {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `city-${Date.now().toString(36)}`
  );
};

/**
 * Active booking statuses considered as "open"
 */
const ACTIVE_BOOKING_STATUSES = [
  'requested',
  'confirmed',
  'assigned',
  'on_the_way',
  'in_progress'
];

/**
 * 1. GET /api/v1/admin/cities
 * Fetch all cities with filtering (status=all|live|paused), search, and operational statistics
 */
const getCities = async (req, res) => {
  try {
    const {
      status = 'all',
      search,
      sortBy = 'order',
      sortOrder = 'ASC'
    } = req.query;

    const where = {};

    // Filter by live/paused status
    if (status === 'live') {
      where.isLive = true;
    } else if (status === 'paused') {
      where.isLive = false;
    }

    // Search query across name or cityId
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { cityId: { [Op.like]: q } }
      ];
    }

    const validSortFields = ['order', 'name', 'createdAt', 'isLive'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'order';
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const cities = await City.findAll({
      where,
      order: [
        [sortField, sortDirection],
        ['id', 'ASC']
      ]
    });

    // Fetch related counts across bookings and staff for operational metrics
    const [allBookings, allStaff] = await Promise.all([
      Booking.findAll({ attributes: ['id', 'city', 'status'] }),
      Staff.findAll({ attributes: ['id', 'city', 'approval', 'onDuty'] })
    ]);

    const citiesWithStats = cities.map((c) => {
      const citySlug = (c.cityId || '').toLowerCase();
      const cityBookings = allBookings.filter(
        (b) => (b.city || '').toLowerCase() === citySlug
      );
      const cityStaff = allStaff.filter(
        (s) => (s.city || '').toLowerCase() === citySlug && s.approval === 'approved'
      );

      const openBookingsCount = cityBookings.filter((b) =>
        ACTIVE_BOOKING_STATUSES.includes(b.status)
      ).length;

      const staffOnDutyCount = cityStaff.filter((s) => s.onDuty).length;

      return {
        id: c.id,
        cityId: c.cityId,
        name: c.name,
        order: c.order,
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        isLive: Boolean(c.isLive),
        hidden: Boolean(c.hidden),
        notes: c.notes,
        stats: {
          staffTotal: cityStaff.length,
          staffOnDuty: staffOnDutyCount,
          openBookings: openBookingsCount,
          totalBookings: cityBookings.length
        },
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });

    // Summary counters
    const totalCount = await City.count();
    const liveCount = await City.count({ where: { isLive: true } });
    const pausedCount = totalCount - liveCount;

    return successResponse(
      res,
      {
        cities: citiesWithStats,
        summary: {
          totalCities: totalCount,
          liveCities: liveCount,
          pausedCities: pausedCount,
          globalFallbackNumbers: {
            phone: process.env.ADMIN_PHONE || '9820012345',
            whatsapp: process.env.ADMIN_PHONE || '9820012345'
          }
        }
      },
      'Cities retrieved successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch cities', 500, error);
  }
};

/**
 * 2. GET /api/v1/admin/cities/:id
 * Fetch single city by id (numeric) or cityId slug (e.g. 'mumbai')
 */
const getCityById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'City identifier is required', 400);
    }

    const city = await City.findOne({
      where: buildCityLookupCondition(id)
    });

    if (!city) {
      return errorResponse(res, `City '${id}' not found`, 404);
    }

    const citySlug = (city.cityId || '').toLowerCase();

    // Fetch related bookings and staff for detailed city stats
    const [cityBookings, cityStaff] = await Promise.all([
      Booking.findAll({
        where: { city: citySlug },
        attributes: ['id', 'status', 'date']
      }),
      Staff.findAll({
        where: { city: citySlug },
        attributes: ['id', 'approval', 'onDuty']
      })
    ]);

    const approvedStaff = cityStaff.filter((s) => s.approval === 'approved');
    const openBookings = cityBookings.filter((b) =>
      ACTIVE_BOOKING_STATUSES.includes(b.status)
    );

    const payload = {
      id: city.id,
      cityId: city.cityId,
      name: city.name,
      order: city.order,
      phone: city.phone || '',
      whatsapp: city.whatsapp || '',
      isLive: Boolean(city.isLive),
      hidden: Boolean(city.hidden),
      notes: city.notes,
      stats: {
        staffTotal: approvedStaff.length,
        staffOnDuty: approvedStaff.filter((s) => s.onDuty).length,
        openBookings: openBookings.length,
        totalBookings: cityBookings.length
      },
      createdAt: city.createdAt,
      updatedAt: city.updatedAt
    };

    return successResponse(res, payload, 'City details retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch city details', 500, error);
  }
};

/**
 * 3. POST /api/v1/admin/cities
 * Create a new operational city with validation
 */
const createCity = async (req, res) => {
  try {
    const { name, cityId, phone, whatsapp, order, notes } = req.body;

    // 1. Validate Name
    if (!name || !name.trim()) {
      return errorResponse(res, 'City name is required and cannot be empty', 400);
    }

    const cleanName = name.trim();
    const cleanCityId = (cityId && cityId.trim()) ? slugifyCityName(cityId) : slugifyCityName(cleanName);

    // 2. Check for duplicate city by name or slug
    const existing = await City.findOne({
      where: {
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), cleanName.toLowerCase()),
          { cityId: cleanCityId }
        ]
      }
    });

    if (existing) {
      return errorResponse(res, `City '${cleanName}' is already in the cities list`, 409);
    }

    // 3. Validate Phone (if provided)
    let cleanPhone = '';
    if (phone && String(phone).trim()) {
      cleanPhone = normalizeDigits(phone);
      if (cleanPhone.length !== 10) {
        return errorResponse(res, 'Dedicated Call phone must be a valid 10-digit mobile number', 400);
      }
    }

    // 4. Validate WhatsApp (if provided)
    let cleanWhatsapp = '';
    if (whatsapp && String(whatsapp).trim()) {
      cleanWhatsapp = normalizeDigits(whatsapp);
      if (cleanWhatsapp.length !== 10) {
        return errorResponse(res, 'Dedicated WhatsApp must be a valid 10-digit mobile number', 400);
      }
    }

    // 5. Order: only set if explicitly provided by caller, no dummy count
    const cityOrder =
      order !== undefined && order !== null && !isNaN(parseInt(order, 10))
        ? parseInt(order, 10)
        : null;

    // 6. Create city (defaults to Live)
    const newCity = await City.create({
      cityId: cleanCityId,
      name: cleanName,
      order: cityOrder,
      phone: cleanPhone,
      whatsapp: cleanWhatsapp,
      isLive: true,
      hidden: false,
      notes: notes || null
    });

    return successResponse(
      res,
      newCity,
      `City '${newCity.name}' added successfully and is now live`,
      201
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to create city', 500, error);
  }
};

/**
 * 4. PUT / PATCH /api/v1/admin/cities/:id
 * Edit city details (name, dedicated numbers, order, notes)
 */
const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, whatsapp, order, notes } = req.body;

    if (!id) {
      return errorResponse(res, 'City identifier is required', 400);
    }

    const city = await City.findOne({
      where: buildCityLookupCondition(id)
    });

    if (!city) {
      return errorResponse(res, `City '${id}' not found`, 404);
    }

    // Validate and update name
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return errorResponse(res, 'City name cannot be empty', 400);
      }
      const cleanName = name.trim();

      // If name changed, check uniqueness
      if (cleanName.toLowerCase() !== city.name.toLowerCase()) {
        const conflict = await City.findOne({
          where: {
            [Op.and]: [
              sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), cleanName.toLowerCase()),
              { id: { [Op.ne]: city.id } }
            ]
          }
        });
        if (conflict) {
          return errorResponse(res, `A city named '${cleanName}' already exists`, 409);
        }
      }
      city.name = cleanName;
    }

    // Validate and update phone
    if (phone !== undefined) {
      if (phone === '' || phone === null) {
        city.phone = '';
      } else {
        const cleanPhone = normalizeDigits(phone);
        if (cleanPhone.length !== 10) {
          return errorResponse(res, 'Dedicated Call phone must be a valid 10-digit number', 400);
        }
        city.phone = cleanPhone;
      }
    }

    // Validate and update WhatsApp
    if (whatsapp !== undefined) {
      if (whatsapp === '' || whatsapp === null) {
        city.whatsapp = '';
      } else {
        const cleanWhatsapp = normalizeDigits(whatsapp);
        if (cleanWhatsapp.length !== 10) {
          return errorResponse(res, 'Dedicated WhatsApp must be a valid 10-digit number', 400);
        }
        city.whatsapp = cleanWhatsapp;
      }
    }

    // Update order
    if (order !== undefined) {
      const parsedOrder = parseInt(order, 10);
      if (!isNaN(parsedOrder)) {
        city.order = parsedOrder;
      }
    }

    // Update notes
    if (notes !== undefined) {
      city.notes = notes;
    }

    await city.save();

    return successResponse(
      res,
      city,
      `City '${city.name}' settings saved successfully`
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to update city settings', 500, error);
  }
};

/**
 * 5. PATCH /api/v1/admin/cities/:id/status
 * Deactivate (Pause) or Activate (Go Live) a city
 * Enforces business rule: "Keep at least one operational live city"
 */
const toggleCityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isLive, status, action } = req.body;

    if (!id) {
      return errorResponse(res, 'City identifier is required', 400);
    }

    const city = await City.findOne({
      where: buildCityLookupCondition(id)
    });

    if (!city) {
      return errorResponse(res, `City '${id}' not found`, 404);
    }

    // Determine target status
    let targetLiveStatus;
    if (isLive !== undefined) {
      targetLiveStatus = Boolean(isLive);
    } else if (status !== undefined) {
      targetLiveStatus = status === 'live';
    } else if (action !== undefined) {
      targetLiveStatus = action === 'go_live' || action === 'activate';
    } else {
      // Toggle
      targetLiveStatus = !city.isLive;
    }

    // GUARD: If attempting to pause/deactivate this city
    if (!targetLiveStatus && city.isLive) {
      const totalLiveCities = await City.count({ where: { isLive: true } });
      if (totalLiveCities <= 1) {
        return errorResponse(
          res,
          `Cannot pause ${city.name}. You must keep at least one operational live city in the system.`,
          400
        );
      }
    }

    // Apply status
    city.isLive = targetLiveStatus;
    city.hidden = !targetLiveStatus;
    await city.save();

    const statusLabel = targetLiveStatus ? 'now live' : 'paused';
    return successResponse(
      res,
      city,
      `${city.name} is ${statusLabel}`
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to update city status', 500, error);
  }
};

/**
 * 6. DELETE /api/v1/admin/cities/:id
 * Delete a city with dependency safety checks (bookings, staff, minimum live city guard)
 */
const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'City identifier is required', 400);
    }

    const city = await City.findOne({
      where: buildCityLookupCondition(id)
    });

    if (!city) {
      return errorResponse(res, `City '${id}' not found`, 404);
    }

    const citySlug = (city.cityId || '').toLowerCase();

    // GUARD 1: Cannot delete if it is the only remaining live city
    if (city.isLive) {
      const liveCount = await City.count({ where: { isLive: true } });
      if (liveCount <= 1) {
        return errorResponse(
          res,
          `Cannot delete ${city.name}. It is the only operational live city.`,
          400
        );
      }
    }

    // GUARD 2: Check existing bookings in this city
    const bookingsCount = await Booking.count({
      where: { city: citySlug }
    });
    if (bookingsCount > 0) {
      return errorResponse(
        res,
        `Cannot delete ${city.name} because it has ${bookingsCount} existing booking(s). Please pause the city instead to preserve historic patient records.`,
        400
      );
    }

    // GUARD 3: Check existing staff registered in this city
    const staffCount = await Staff.count({
      where: { city: citySlug }
    });
    if (staffCount > 0) {
      return errorResponse(
        res,
        `Cannot delete ${city.name} because ${staffCount} staff member(s) are registered in this city. Reassign or remove staff first.`,
        400
      );
    }

    const cityName = city.name;
    await city.destroy();

    return successResponse(
      res,
      { cityId: citySlug, name: cityName },
      `City '${cityName}' deleted successfully`
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to delete city', 500, error);
  }
};

/**
 * 7. GET /api/v1/cities (Public / Client App)
 * Returns live operational cities for clients choosing their city during booking
 */
const getPublicLiveCities = async (req, res) => {
  try {
    const liveCities = await City.findAll({
      where: {
        isLive: true,
        hidden: false,
      },
      order: [
        ['order', 'ASC'],
        ['name', 'ASC']
      ],
      attributes: ['id', 'cityId', 'name', 'order', 'phone', 'whatsapp']
    });

    return successResponse(
      res,
      liveCities,
      'Operational cities retrieved successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch cities', 500, error);
  }
};

module.exports = {
  getCities,
  getCityById,
  createCity,
  updateCity,
  toggleCityStatus,
  deleteCity,
  getPublicLiveCities
};
