const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');
const adminAuthRoutes = require('./admin.auth.routes');
const adminRoutes = require('./admin.routes');
const authRoutes = require('./auth.routes');
const staffRoutes = require('./staff.routes');
const clientRoutes = require('./client.routes');
const settingRoutes = require('./setting.routes');
const cancellationRoutes = require('./cancellation.routes');
const { getPublicLiveCities } = require('../controllers/city.controller');
const {
  getPublicServices,
  getPublicCategories,
  getPublicServiceById,
} = require('../controllers/service.controller');

// API status and health check
router.use('/', healthRoutes);

// Public cities endpoint (active operational cities)
router.get('/cities', getPublicLiveCities);

// Public services catalog endpoints (active operational services & categories)
router.get('/services', getPublicServices);
router.get('/services/categories', getPublicCategories);
router.get('/services/:id', getPublicServiceById);

// Public Coming Soon Notify Me & In-App Notification convenience aliases
const { optionalToken } = require('../middlewares/auth.middleware');
const {
  subscribeNotifyMe,
  getClientNotifications,
  getNotifyMeStatus,
} = require('../controllers/notification.controller');

router.post('/notify-me', optionalToken, subscribeNotifyMe);
router.get('/notify-me/status', optionalToken, getNotifyMeStatus);
router.get('/notifications', optionalToken, getClientNotifications);

// General auth routes (client & staff login)
router.use('/auth', authRoutes);

// Admin authentication & operations routes
router.use('/admin', adminAuthRoutes);
router.use('/admin', adminRoutes);

// Staff management & registration routes
router.use('/staff', staffRoutes);

// Client management, registration, and login routes
router.use('/client', clientRoutes);

// Global settings routes (accessible via /settings and /setting)
router.use('/setting', settingRoutes);

// Booking cancellation flow routes
router.use('/cancellation', cancellationRoutes);

module.exports = router;
