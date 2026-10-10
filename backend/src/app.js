const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Eldoria Care API',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health'
    }
  });
});

// Mount API routes
app.use('/api/v1', apiRoutes);

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Central Error Handler
app.use(errorHandler);

module.exports = app;
