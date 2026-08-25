const User = require('../models/User.model');
const { 
  hashPassword, 
  comparePassword, 
  generateTokens,
  verifyRefreshToken,
  blacklistToken,
  getTokenExpiry,
} = require('../services/auth.service');
const { writeAuditLog } = require('../services/audit.service');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { runDetectionChecks } = require('../services/suspiciousDetection.service');

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      // Log failed attempt
      await writeAuditLog({
        actorId: null,
        action: 'LoginFailed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Failure',
        metadata: { email },
      }).catch(() => {});

      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
        401
      ));
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json(errorResponse(
        ErrorCodes.RBAC_DENIED,
        'Account is deactivated',
        403
      ));
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed attempt
      await writeAuditLog({
        actorId: user._id,
        action: 'LoginFailed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Failure',
        metadata: { email },
      }).catch(() => {});

      // Run detection checks for failed login
      await runDetectionChecks(user._id, req.ip, 'LoginFailed');

      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
        401
      ));
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log successful login
    await writeAuditLog({
      actorId: user._id,
      action: 'Login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { email: user.email },
    });

    // Run detection checks for successful login
    await runDetectionChecks(user._id, req.ip, 'Login');

    // Remove password hash from response
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.json(successResponse({
      user: userResponse,
      accessToken,
      refreshToken,
    }, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_MISSING,
        'Refresh token required',
        400
      ));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_INVALID,
        'Invalid refresh token',
        401
      ));
    }

    // Check if user exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_INVALID,
        'User not found or deactivated',
        401
      ));
    }

    // Generate new access token
    const { accessToken } = generateTokens(user._id, user.role);

    // Log refresh
    await writeAuditLog({
      actorId: user._id,
      action: 'TokenRefreshed',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { email: user.email },
    }).catch(() => {});

    res.json(successResponse({
      accessToken,
    }, 'Token refreshed'));
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const token = req.token;
    
    if (token) {
      const expiry = getTokenExpiry(token);
      await blacklistToken(token, Math.max(expiry, 60));
    }

    // Log logout
    if (req.user) {
      await writeAuditLog({
        actorId: req.user._id,
        action: 'Logout',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Success',
        metadata: { email: req.user.email },
      });
    }

    res.json(successResponse(null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 * PATCH /api/v1/auth/preferences
 */
const updatePreferences = async (req, res, next) => {
  try {
    const { notificationPreferences } = req.body;
    
    if (!notificationPreferences) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Notification preferences are required',
        400
      ));
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json(errorResponse(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'User not found',
        404
      ));
    }
    
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...notificationPreferences
    };
    
    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    
    res.json(successResponse({ user: userResponse }, 'Preferences updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * PATCH /api/v1/auth/password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Current and new passwords are required',
        400
      ));
    }
    
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json(errorResponse(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'User not found',
        404
      ));
    }
    
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json(errorResponse(
        ErrorCodes.AUTH_INVALID_CREDENTIALS,
        'Invalid current password',
        400
      ));
    }
    
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    
    // Log password change
    await writeAuditLog({
      actorId: user._id,
      action: 'PasswordChanged',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { email: user.email },
    });
    
    res.json(successResponse(null, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  updatePreferences,
  changePassword,
};