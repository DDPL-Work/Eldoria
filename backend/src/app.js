const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { getHealthStatus } = require('./controllers/health.controller');

const app = express();

// HTTP Security Headers & Identity Masking (SEC-12)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.disable('x-powered-by');

// CORS configuration (SEC-12)
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL_DEV;
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
  credentials: true,
}));

// Body Limits: 2MB limit prevents payload flooding / DoS attacks (SEC-07)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Auth & OTP Rate Limiter (SEC-08): 30 requests per 15 minutes per IP (skipped during test runs)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

app.use('/api/v1/auth/send-otp', authLimiter);
app.use('/api/v1/auth/verify-otp', authLimiter);
app.use('/api/v1/client/send-otp', authLimiter);
app.use('/api/v1/client/verify-otp', authLimiter);
app.use('/api/v1/client/login', authLimiter);
app.use('/api/v1/admin/login', authLimiter);

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Eldoria Care API',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      docs: '/api/v1'
    }
  });
});

// Direct alias for health check as advertised in server startup log (/api/health)
app.get('/api/health', getHealthStatus);

// Mount API v1 routes
app.use('/api/v1', apiRoutes);

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Central Error Handler
app.use(errorHandler);

module.exports = app;