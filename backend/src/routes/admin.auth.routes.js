const express = require('express');
const router = express.Router();
const {adminLogin,adminForgotPassword,adminResetPassword,adminChangePhone,getAdminProfile,
  updateAdminProfile,adminChangePassword,} = require('../controllers/admin.auth.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

// 1. Admin Authentication
router.post('/login', adminLogin);
router.post('/forgot-password', adminForgotPassword);
router.post('/reset-password', adminResetPassword);

// 2. Admin Profile Management
router.get('/profile', verifyToken, requireAdmin, getAdminProfile);
router.patch('/edit/profile', verifyToken, requireAdmin, updateAdminProfile);

// 3. Admin Change Password from Profile
router.patch('/change-password', verifyToken, requireAdmin, adminChangePassword);

// 4. Admin Change Mobile Number
router.patch('/change-phone', verifyToken, requireAdmin, adminChangePhone);

module.exports = router;
