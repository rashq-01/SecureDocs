const { verifyAccessToken, isTokenBlacklisted } = require('../services/auth.service');
const User = require('../models/User.model');
const { errorResponse, ErrorCodes } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/audit.service');
const logger = require('../utils/logger');

const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_MISSING,
        'Authentication token is missing',
        401
      ));
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_INVALID,
        'Token has been revoked',
        401
      ));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.message === 'AUTH_TOKEN_EXPIRED') {
        return res.status(401).json(errorResponse(
          ErrorCodes.AUTH_TOKEN_EXPIRED,
          'Token has expired',
          401
        ));
      }
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_INVALID,
        'Invalid token',
        401
      ));
    }

    // Get user from database
    const user = await User.findById(decoded.userId)
      .select('-passwordHash')
      .populate('assignedCases', 'caseId title');

    if (!user) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_INVALID,
        'User not found',
        401
      ));
    }

    if (!user.isActive) {
      return res.status(403).json(errorResponse(
        ErrorCodes.RBAC_DENIED,
        'Account is deactivated',
        403
      ));
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error(`JWT verification error: ${error.message}`);
    return res.status(401).json(errorResponse(
      ErrorCodes.AUTH_TOKEN_INVALID,
      'Authentication failed',
      401
    ));
  }
};

module.exports = verifyJWT;