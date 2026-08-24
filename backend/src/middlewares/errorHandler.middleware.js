const { errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    console.error('MONGOOSE VALIDATION ERROR:', errors);
    return res.status(400).json(errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      errors
    ));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json(errorResponse(
      ErrorCodes.DUPLICATE_ENTRY,
      `${field} already exists`,
      400
    ));
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json(errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid ID format',
      400
    ));
  }

  // JWT errors (handled in middleware, but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(errorResponse(
      ErrorCodes.AUTH_TOKEN_INVALID,
      'Invalid token',
      401
    ));
  }

  // Rate limit errors (handled in middleware)
  if (err.code === 'RATE_LIMIT') {
    return res.status(429).json(errorResponse(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Too many requests',
      429
    ));
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || ErrorCodes.SERVER_ERROR;
  const message = err.isOperational ? err.message : 'Internal server error';

  return res.status(statusCode).json(errorResponse(
    errorCode,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  ));
};

module.exports = errorHandler;