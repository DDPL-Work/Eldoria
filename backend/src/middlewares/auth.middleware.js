const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utills/responseHandler');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication token missing or invalid', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'eldoria_super_secret_jwt_key_2026');
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, 'Unauthorized: Invalid or expired token', 403, error);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied: Administrator privileges required', 403);
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (!req.user || req.user.role !== 'staff') {
    return errorResponse(res, 'Access denied: Staff privileges required', 403);
  }
  next();
};

const requireClient = (req, res, next) => {
  if (!req.user || req.user.role !== 'client') {
    return errorResponse(res, 'Access denied: Client privileges required', 403);
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireStaff,
  requireClient,
};
