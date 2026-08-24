const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain password with a hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate access and refresh tokens
 */
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    config.jwtAccessSecret,
    { expiresIn: config.jwtAccessExpiry }
  );
  
  const refreshToken = jwt.sign(
    { userId, role },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiry }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Verify an access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwtAccessSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('AUTH_TOKEN_EXPIRED');
    }
    throw new Error('AUTH_TOKEN_INVALID');
  }
};

/**
 * Verify a refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('AUTH_TOKEN_EXPIRED');
    }
    throw new Error('AUTH_TOKEN_INVALID');
  }
};

/**
 * Blacklist a token in Redis
 */
const blacklistToken = async (token, expirySeconds = 900) => {
  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx(`blacklist:${token}`, expirySeconds, 'true');
      logger.debug(`Token blacklisted: ${token.substring(0, 20)}...`);
      return true;
    }
    // If Redis is not available, just log and continue
    logger.warn('Redis unavailable, token blacklist skipped');
    return false;
  } catch (error) {
    logger.error(`Failed to blacklist token: ${error.message}`);
    return false;
  }
};

/**
 * Check if a token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isOpen) {
      const result = await redisClient.get(`blacklist:${token}`);
      return result === 'true';
    }
    // If Redis is not available, assume token is valid
    return false;
  } catch (error) {
    logger.error(`Failed to check token blacklist: ${error.message}`);
    return false;
  }
};

/**
 * Get token expiry in seconds from JWT
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return decoded.exp - Math.floor(Date.now() / 1000);
    }
    return 900; // Default 15 minutes
  } catch {
    return 900;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
  getTokenExpiry,
};