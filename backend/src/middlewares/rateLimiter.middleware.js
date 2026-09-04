const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const { errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Create a Redis-backed rate limiter with fallback
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,
    max = 60,
    message = 'Too many requests, please try again later',
    keyPrefix = 'rate-limit',
  } = options;

  let store;
  try {
    store = new RedisStore({
      sendCommand: (...args) => {
        const { getRedisClient } = require('../config/redis');
        const redis = getRedisClient();
        if (redis) {
          return redis.sendCommand(args);
        }
        return Promise.reject(new Error('Redis client not available'));
      },
      prefix: keyPrefix,
    });
  } catch (error) {
    logger.warn(`Redis store error: ${error.message}, using memory store`);
    const MemoryStore = rateLimit.MemoryStore;
    store = new MemoryStore();
  }

  return rateLimit({
    store,
    windowMs,
    max,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
      
      // Log to audit if user is authenticated
      if (req.user) {
        const { writeAuditLog } = require('../services/audit.service');
        writeAuditLog({
          actorId: req.user._id,
          action: 'RateLimitExceeded',
          ipAddress: req.ip,
          result: 'Failure',
          metadata: { path: req.path, limit: max, windowMs },
        }).catch(() => {});
      }
      
      return res.status(429).json(errorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        message,
        429
      ));
    },
    keyGenerator: (req) => {
      // Use IP + user ID if authenticated for stricter limiting
      if (req.user && req.user._id) {
        return `${req.ip}:${req.user._id}`;
      }
      return req.ip;
    },
    skip: (req) => req.path === '/health',
  });
};

// Specific rate limiters with meaningful limits
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  keyPrefix: 'rate-limit:login',
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  keyPrefix: 'rate-limit:upload',
  message: 'Upload limit reached. Please try again later.',
});

const downloadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 downloads per minute
  keyPrefix: 'rate-limit:download',
  message: 'Download limit reached. Please slow down.',
});

const shareRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 shares per minute
  keyPrefix: 'rate-limit:share',
  message: 'Share limit reached. Please try again later.',
});

const accessRequestRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  keyPrefix: 'rate-limit:access-request',
  message: 'Too many access requests. Please wait.',
});

// General API rate limiter
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyPrefix: 'rate-limit:api',
  message: 'Too many requests. Please slow down.',
});

// Stricter limiter for sensitive operations
const sensitiveApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyPrefix: 'rate-limit:sensitive',
  message: 'Too many sensitive operations. Please try again later.',
});

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  uploadRateLimiter,
  downloadRateLimiter,
  shareRateLimiter,
  accessRequestRateLimiter,
  apiRateLimiter,
  sensitiveApiRateLimiter,
};