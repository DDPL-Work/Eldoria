const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');
const {
  getSettings,
  updateSettings,
  toggleStaffCanConfirm,
} = require('../controllers/setting.controller');

// Public settings read endpoint (accessible by client app & staff app)
router.get('/', getSettings);

// Admin settings configuration routes
router.patch('/update', verifyToken, requireAdmin, updateSettings);
router.patch('/staff-confirm', verifyToken, requireAdmin, toggleStaffCanConfirm);

module.exports = router;
