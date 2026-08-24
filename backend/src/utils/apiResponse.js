/**
 * Standardized API response formatter
 */
const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    data,
    message,
    statusCode,
  };
};

const errorResponse = (code, message, statusCode = 400, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details) {
    response.error.details = details;
  }
  return {
    ...response,
    statusCode,
  };
};

// Common error codes
const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  RBAC_DENIED: 'RBAC_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  CASE_NOT_FOUND: 'CASE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TAMPER_DETECTED: 'TAMPER_DETECTED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
};

module.exports = {
  successResponse,
  errorResponse,
  ErrorCodes,
};