const express = require('express');
const router = express.Router();
const { adminLogin } = require('../controllers/admin.auth.controller');

router.post('/login', adminLogin);

module.exports = router;
