const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');
const adminAuthRoutes = require('./admin.auth.routes');
const adminRoutes = require('./admin.routes');
const authRoutes = require('./auth.routes');
const staffRoutes = require('./staff.routes');
const clientRoutes = require('./client.routes');

// API status and health check
router.use('/', healthRoutes);

// General auth routes (client & staff login)
router.use('/auth', authRoutes);

// Admin authentication & operations routes
router.use('/admin', adminAuthRoutes);
router.use('/admin', adminRoutes);

// Staff management & registration routes
router.use('/staff', staffRoutes);

// Client management, registration, and login routes
router.use('/client', clientRoutes);

module.exports = router;
