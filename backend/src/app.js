const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { getHealthStatus } = require('./controllers/health.controller');

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

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
