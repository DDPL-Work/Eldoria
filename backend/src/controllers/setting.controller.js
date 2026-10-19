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
 * 3. GET /api/v1/admin/settings/staff-confirm/:staffId?
 * Retrieve booking confirmation & transfer permissions per staff member or all staff
 */
const getStaffPermissions = async (req, res) => {
  try {
    const staffIdentifier = req.params?.staffId || req.query?.staffId;

    if (staffIdentifier) {
      const staff = await Staff.findOne({
        where: {
          [Op.or]: [
            { staffId: String(staffIdentifier).trim() },
            ...(isNaN(staffIdentifier) ? [] : [{ id: Number(staffIdentifier) }]),
          ],
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone'],
          },
        ],
      });

      if (!staff) {
        return errorResponse(res, `Staff member '${staffIdentifier}' not found`, 404);
      }

      return successResponse(
        res,
        {
          id: staff.id,
          staffId: staff.staffId,
          name: staff.user?.name || staff.staffId,
          phone: staff.user?.phone || null,
          role: staff.qualification || 'Caregiver',
          approval: staff.approval,
          canConfirmBooking: Boolean(staff.canConfirmBooking),
          canTransferBooking: Boolean(staff.canTransferBooking),
        },
        `Permissions retrieved for ${staff.user?.name || staff.staffId}`
      );
    }

    const staffList = await Staff.findAll({
      attributes: ['id', 'staffId', 'qualification', 'approval', 'canConfirmBooking', 'canTransferBooking'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['staffId', 'ASC']],
    });

    const data = staffList.map((s) => ({
      id: s.id,
      staffId: s.staffId,
      name: s.user?.name || s.staffId,
      phone: s.user?.phone || null,
      role: s.qualification || 'Caregiver',
      approval: s.approval,
      canConfirmBooking: Boolean(s.canConfirmBooking),
      canTransferBooking: Boolean(s.canTransferBooking),
    }));

    return successResponse(res, data, 'Staff permissions list retrieved successfully');
  } catch (error) {
    console.error('❌ Error retrieving staff permissions:', error);
    return errorResponse(res, error.message || 'Failed to retrieve staff permissions', 500, error);
  }
};

/**
 * 4. PATCH /api/v1/admin/settings/staff-confirm/:staffId?
 * Configure caregiver booking confirmation & transfer permissions per staff using staffId
 */
const toggleStaffCanConfirm = async (req, res) => {
  try {
    const staffIdentifier =
      req.params?.staffId ||
      req.body?.staffId ||
      req.query?.staffId ||
      req.body?.id;

    if (!staffIdentifier) {
      return errorResponse(
        res,
        "Staff identifier ('staffId') is required to configure staff permissions.",
        400
      );
    }

    const staff = await Staff.findOne({
      where: {
        [Op.or]: [
          { staffId: String(staffIdentifier).trim() },
          ...(isNaN(staffIdentifier) ? [] : [{ id: Number(staffIdentifier) }]),
        ],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    if (!staff) {
      return errorResponse(res, `Staff member '${staffIdentifier}' not found`, 404);
    }

    let hasExplicitUpdate = false;

    // 1. canConfirmBooking permission (supports canConfirmBooking, staffCanConfirm, canConfirm)
    if (req.body?.canConfirmBooking !== undefined) {
      staff.canConfirmBooking = Boolean(req.body.canConfirmBooking);
      hasExplicitUpdate = true;
    } else if (req.body?.staffCanConfirm !== undefined) {
      staff.canConfirmBooking = Boolean(req.body.staffCanConfirm);
      hasExplicitUpdate = true;
    } else if (req.body?.canConfirm !== undefined) {
      staff.canConfirmBooking = Boolean(req.body.canConfirm);
      hasExplicitUpdate = true;
    }

    // 2. canTransferBooking permission (supports canTransferBooking, staffCanTransfer, canTransfer)
    if (req.body?.canTransferBooking !== undefined) {
      staff.canTransferBooking = Boolean(req.body.canTransferBooking);
      hasExplicitUpdate = true;
    } else if (req.body?.staffCanTransfer !== undefined) {
      staff.canTransferBooking = Boolean(req.body.staffCanTransfer);
      hasExplicitUpdate = true;
    } else if (req.body?.canTransfer !== undefined) {
      staff.canTransferBooking = Boolean(req.body.canTransfer);
      hasExplicitUpdate = true;
    }

    // If no specific boolean was passed in body, toggle canConfirmBooking (quick toggle behavior)
    if (!hasExplicitUpdate) {
      staff.canConfirmBooking = !staff.canConfirmBooking;
    }

    await staff.save();

    const staffName = staff.user?.name || staff.staffId;
    const message = `Permissions updated for ${staffName}: canConfirmBooking=${staff.canConfirmBooking}, canTransferBooking=${staff.canTransferBooking}`;

    return successResponse(
      res,
      {
        id: staff.id,
        staffId: staff.staffId,
        name: staffName,
        phone: staff.user?.phone || null,
        approval: staff.approval,
        canConfirmBooking: staff.canConfirmBooking,
        canTransferBooking: staff.canTransferBooking,
      },
      message
    );
  } catch (error) {
    console.error('❌ Error configuring staff permissions:', error);
    return errorResponse(res, error.message || 'Failed to update staff permissions', 500, error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getStaffPermissions,
  toggleStaffCanConfirm,
};

