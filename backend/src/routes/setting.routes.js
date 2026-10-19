const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');
const {
  getSettings,
  updateSettings,
  getStaffPermissions,
  toggleStaffCanConfirm,
} = require('../controllers/setting.controller');

// Public settings read endpoint (accessible by client app & staff app)
router.get('/', getSettings);

// Admin settings configuration routes
router.patch('/update', verifyToken, requireAdmin, updateSettings);

// Staff booking confirmation & transfer permissions per staffId
router.get('/staff-confirm/:staffId', verifyToken, requireAdmin, getStaffPermissions);
router.patch('/staff-confirm/:staffId', verifyToken, requireAdmin, toggleStaffCanConfirm);

module.exports = router;
