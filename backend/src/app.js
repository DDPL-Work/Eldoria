const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { getHealthStatus } = require('./controllers/health.controller');

const app = express();

// Dynamic CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'https://eldoria-admin.vercel.app',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        process.env.CORS_ORIGIN === '*' ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, origin);
      }
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'staffid',
      'x-staff-id',
      'Accept',
    ],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
