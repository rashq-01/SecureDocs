const { validationResult } = require('express-validator');
const { errorResponse, ErrorCodes } = require('../utils/apiResponse');

/**
 * Middleware to validate request using express-validator
 * This MUST be used after validation rules
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    
    return res.status(400).json(errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      errorMessages
    ));
  }
  
  next();
};

module.exports = { validateRequest };