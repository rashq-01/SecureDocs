const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const { apiRateLimiter } = require('./middlewares/rateLimiter.middleware');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
}));

// CORS
app.use(cors({
  origin: config.frontendOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Disposition'],
}));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
try {
  app.use(apiRateLimiter);
} catch (error) {
  logger.warn(`Rate limiter initialization error: ${error.message}`);
}

// REMOVED: Public file serving - SECURITY FIX
// Files should only be served through authenticated download endpoints
// app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// API routes
app.use('/api/v1', routes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;