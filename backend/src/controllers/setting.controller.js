const { Op } = require('sequelize');
const {
  sequelize,
  Setting,
  City,
  Category,
  Service,
  Staff,
  Client,
  User,
  Booking,
  Enquiry,
  Otp,
} = require('../database/models');
const { successResponse, errorResponse } = require('../utills/responseHandler');

/**
 * Standardize phone / whatsapp numbers to 10 digits
 */
const normalizeDigits = (val = '') => {
  return String(val || '').replace(/\D/g, '').trim();
};

/**
 * Default App Settings
 */
const DEFAULT_APP_SETTINGS = {
  id: 'app',
  phone: '9820012345',
  whatsapp: '9820012345',
  heroVideo: '',
  staffCanConfirm: true,
  extra: {},
};

/**
 * Helper to ensure the default 'app' setting row exists
 */
const ensureAppSettings = async () => {
  let setting = await Setting.findByPk('app');
  if (!setting) {
    setting = await Setting.create(DEFAULT_APP_SETTINGS);
  }
  return setting;
};

/**
 * 1. GET /api/v1/settings OR /api/v1/admin/settings
 * Retrieve global care desk settings (Call number, WhatsApp, hero video, caregiver confirm permission)
 */
const getSettings = async (req, res) => {
  try {
    const setting = await ensureAppSettings();
    return successResponse(res, setting, 'Settings retrieved successfully');
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    return errorResponse(res, error.message || 'Failed to fetch settings', 500, error);
  }
};

/**
 * 2. PUT/PATCH /api/v1/admin/settings
 * Update global Care Desk contact info and settings
 */
const updateSettings = async (req, res) => {
  try {
    const { phone, whatsapp, heroVideo, extra } = req.body;
    const setting = await ensureAppSettings();

    // Validate phone (10 digits if provided)
    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const p = normalizeDigits(phone);
      if (p.length !== 10) {
        return errorResponse(res, 'Please enter a valid 10-digit phone number', 400);
      }
      setting.phone = p;
    }

    // Validate WhatsApp (10 digits if provided)
    if (whatsapp !== undefined && whatsapp !== null && String(whatsapp).trim() !== '') {
      const w = normalizeDigits(whatsapp);
      if (w.length !== 10) {
        return errorResponse(res, 'Please enter a valid 10-digit WhatsApp number', 400);
      }
      setting.whatsapp = w;
    }

    // Validate heroVideo URL if provided
    if (heroVideo !== undefined && heroVideo !== null) {
      const hv = String(heroVideo || '').trim();
      if (hv && !/^https?:\/\/\S+$/i.test(hv)) {
        return errorResponse(res, 'Video link must start with http:// or https://', 400);
      }
      setting.heroVideo = hv;
    }

    if (extra !== undefined) {
      setting.extra = typeof extra === 'object' && extra !== null ? extra : {};
    }

    await setting.save();

    return successResponse(res, setting, 'Settings saved successfully');
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    return errorResponse(res, error.message || 'Failed to update settings', 500, error);
  }
};

/**
 * 3. PATCH /api/v1/admin/settings/staff-confirm
 * Toggle or set caregiver booking confirmation permission
 */
const toggleStaffCanConfirm = async (req, res) => {
  try {
    const setting = await ensureAppSettings();

    let nextValue;
    if (req.body && req.body.staffCanConfirm !== undefined) {
      nextValue = Boolean(req.body.staffCanConfirm);
    } else {
      nextValue = !setting.staffCanConfirm;
    }

    setting.staffCanConfirm = nextValue;
    await setting.save();

    const message = nextValue
      ? 'Staff can now confirm and assign bookings'
      : 'Staff can no longer confirm bookings';

    return successResponse(
      res,
      {
        id: setting.id,
        staffCanConfirm: setting.staffCanConfirm,
      },
      message
    );
  } catch (error) {
    console.error('❌ Error toggling staff confirm permission:', error);
    return errorResponse(res, error.message || 'Failed to update staff confirm permission', 500, error);
  }
};


module.exports = {
  getSettings,
  updateSettings,
  toggleStaffCanConfirm,
};
