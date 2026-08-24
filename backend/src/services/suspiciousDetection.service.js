const AuditLog = require('../models/AuditLog.model');
const Document = require('../models/Document.model');
const User = require('../models/User.model');
const { writeAuditLog } = require('./audit.service');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

// Detection rules configuration
const RULES = {
  // Rule 1: Excessive downloads in short time
  EXCESSIVE_DOWNLOADS: {
    enabled: true,
    windowMinutes: 2,
    threshold: 50,
    action: 'SUSPICIOUS_ACTIVITY',
    severity: 'HIGH',
  },
  // Rule 2: Multiple failed logins from different IPs
  MULTIPLE_IP_LOGIN_FAILURES: {
    enabled: true,
    windowMinutes: 15,
    threshold: 5,
    uniqueIPs: 3,
    action: 'SUSPICIOUS_ACTIVITY',
    severity: 'HIGH',
  },
  // Rule 3: Unusual access time (outside working hours)
  UNUSUAL_ACCESS_TIME: {
    enabled: true,
    workingHoursStart: 9, // 9 AM
    workingHoursEnd: 18, // 6 PM
    action: 'SUSPICIOUS_ACTIVITY',
    severity: 'MEDIUM',
  },
  // Rule 4: Access from multiple countries in short time
  MULTIPLE_COUNTRY_ACCESS: {
    enabled: true,
    windowMinutes: 30,
    threshold: 3,
    action: 'SUSPICIOUS_ACTIVITY',
    severity: 'HIGH',
  },
  // Rule 5: First time document access by user
  FIRST_TIME_ACCESS: {
    enabled: true,
    action: 'SUSPICIOUS_ACTIVITY',
    severity: 'MEDIUM',
  },
  // Rule 6: Access to restricted classification without permission
  RESTRICTED_ACCESS_ATTEMPT: {
    enabled: true,
    action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    severity: 'CRITICAL',
  },
  // Rule 7: Sequential document access (scraping behavior)
  SEQUENTIAL_ACCESS: {
    enabled: true,
    windowMinutes: 1,
    threshold: 20,
    action: 'SUSPICIOUS_ACTIVITY',
    severity: 'HIGH',
  },
};

/**
 * Check for excessive downloads
 */
const checkExcessiveDownloads = async (userId, ipAddress) => {
  try {
    const since = new Date(Date.now() - RULES.EXCESSIVE_DOWNLOADS.windowMinutes * 60 * 1000);
    
    const count = await AuditLog.countDocuments({
      actorId: userId,
      action: 'DocumentDownloaded',
      result: 'Success',
      timestamp: { $gte: since },
    });

    if (count >= RULES.EXCESSIVE_DOWNLOADS.threshold) {
      await createAlert({
        userId,
        ipAddress,
        rule: 'EXCESSIVE_DOWNLOADS',
        severity: RULES.EXCESSIVE_DOWNLOADS.severity,
        details: {
          downloads: count,
          windowMinutes: RULES.EXCESSIVE_DOWNLOADS.windowMinutes,
          threshold: RULES.EXCESSIVE_DOWNLOADS.threshold,
        },
      });
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Excessive downloads check failed: ${error.message}`);
    return false;
  }
};

/**
 * Check for multiple IP login failures
 */
const checkMultipleIPLoginFailures = async (userId, ipAddress) => {
  try {
    const since = new Date(Date.now() - RULES.MULTIPLE_IP_LOGIN_FAILURES.windowMinutes * 60 * 1000);
    
    const failures = await AuditLog.find({
      actorId: userId,
      action: 'LoginFailed',
      timestamp: { $gte: since },
    });

    if (failures.length >= RULES.MULTIPLE_IP_LOGIN_FAILURES.threshold) {
      const uniqueIPs = new Set(failures.map(f => f.ipAddress));
      
      if (uniqueIPs.size >= RULES.MULTIPLE_IP_LOGIN_FAILURES.uniqueIPs) {
        await createAlert({
          userId,
          ipAddress,
          rule: 'MULTIPLE_IP_LOGIN_FAILURES',
          severity: RULES.MULTIPLE_IP_LOGIN_FAILURES.severity,
          details: {
            attempts: failures.length,
            uniqueIPs: Array.from(uniqueIPs),
            windowMinutes: RULES.MULTIPLE_IP_LOGIN_FAILURES.windowMinutes,
          },
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error(`Multiple IP login failures check failed: ${error.message}`);
    return false;
  }
};

/**
 * Check for unusual access time
 */
const checkUnusualAccessTime = async (userId, ipAddress) => {
  try {
    const hour = new Date().getHours();
    const start = RULES.UNUSUAL_ACCESS_TIME.workingHoursStart;
    const end = RULES.UNUSUAL_ACCESS_TIME.workingHoursEnd;
    
    if (hour < start || hour >= end) {
      await createAlert({
        userId,
        ipAddress,
        rule: 'UNUSUAL_ACCESS_TIME',
        severity: RULES.UNUSUAL_ACCESS_TIME.severity,
        details: {
          currentHour: hour,
          workingHours: `${start}:00 - ${end}:00`,
        },
      });
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Unusual access time check failed: ${error.message}`);
    return false;
  }
};

/**
 * Check for first time access to document
 */
const checkFirstTimeAccess = async (userId, documentId, ipAddress) => {
  try {
    const previousAccess = await AuditLog.findOne({
      actorId: userId,
      targetDocumentId: documentId,
      action: { $in: ['DocumentViewed', 'DocumentDownloaded'] },
    });

    if (!previousAccess) {
      // First time access
      await createAlert({
        userId,
        ipAddress,
        rule: 'FIRST_TIME_ACCESS',
        severity: RULES.FIRST_TIME_ACCESS.severity,
        details: {
          documentId,
          action: 'First time accessing this document',
        },
      });
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`First time access check failed: ${error.message}`);
    return false;
  }
};

/**
 * Check for restricted access attempts
 */
const checkRestrictedAccessAttempt = async (userId, documentId, ipAddress) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) return false;

    if (document.classificationLevel === 'Restricted') {
      // Check if user has permission
      const user = await User.findById(userId);
      if (!user) return false;

      // Admin and owners can access
      if (user.role === 'Admin') return false;
      
      // Check if user has specific permission
      const permissions = document.permissions || new Map();
      const userPermissions = permissions.get(userId.toString()) || [];
      
      if (!userPermissions.includes('VIEW')) {
        await createAlert({
          userId,
          ipAddress,
          rule: 'RESTRICTED_ACCESS_ATTEMPT',
          severity: RULES.RESTRICTED_ACCESS_ATTEMPT.severity,
          details: {
            documentId,
            classification: document.classificationLevel,
            userRole: user.role,
          },
        });
        
        // Log unauthorized access attempt
        await writeAuditLog({
          actorId: userId,
          action: 'UnauthorizedAccessAttempt',
          targetDocumentId: documentId,
          ipAddress,
          result: 'Failure',
          metadata: {
            classification: document.classificationLevel,
            userRole: user.role,
            reason: 'Insufficient permissions for restricted document',
          },
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error(`Restricted access check failed: ${error.message}`);
    return false;
  }
};

/**
 * Check for sequential document access (scraping behavior)
 */
const checkSequentialAccess = async (userId, ipAddress) => {
  try {
    const since = new Date(Date.now() - RULES.SEQUENTIAL_ACCESS.windowMinutes * 60 * 1000);
    
    const accesses = await AuditLog.find({
      actorId: userId,
      action: { $in: ['DocumentViewed', 'DocumentDownloaded'] },
      timestamp: { $gte: since },
    }).sort({ timestamp: 1 });

    if (accesses.length >= RULES.SEQUENTIAL_ACCESS.threshold) {
      // Check if they're sequential (accessing documents in order)
      const documentIds = accesses.map(a => a.targetDocumentId?.toString()).filter(Boolean);
      
      if (documentIds.length >= RULES.SEQUENTIAL_ACCESS.threshold) {
        await createAlert({
          userId,
          ipAddress,
          rule: 'SEQUENTIAL_ACCESS',
          severity: RULES.SEQUENTIAL_ACCESS.severity,
          details: {
            accesses: accesses.length,
            windowMinutes: RULES.SEQUENTIAL_ACCESS.windowMinutes,
            documentIds: documentIds.slice(0, 10), // First 10 for context
          },
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error(`Sequential access check failed: ${error.message}`);
    return false;
  }
};

/**
 * Create a security alert
 */
const createAlert = async ({ userId, ipAddress, rule, severity, details }) => {
  try {
    const alertKey = `alert:${userId}:${rule}`;
    const cooldownMinutes = 5;
    const existing = await redisClient.get(alertKey);
    
    // Prevent alert spam
    if (existing) {
      logger.debug(`Alert already sent for ${rule} on user ${userId}`);
      return false;
    }

    // Set cooldown
    await redisClient.setEx(alertKey, cooldownMinutes * 60, 'true');

    // Write to audit log
    await writeAuditLog({
      actorId: userId,
      action: 'SuspiciousActivity',
      ipAddress,
      result: 'Warning',
      metadata: {
        rule,
        severity,
        details,
        detectedAt: new Date().toISOString(),
        alertId: `ALERT-${Date.now()}`,
      },
    });

    logger.warn(`Security alert: ${rule} - User: ${userId} - Severity: ${severity}`);

    // Emit via Socket.IO if available
    const { emitActivity } = require('../sockets');
    emitActivity({
      action: 'SecurityAlert',
      actor: userId,
      metadata: {
        rule,
        severity,
        details,
        timestamp: new Date().toISOString(),
      },
    });

    return true;
  } catch (error) {
    logger.error(`Failed to create alert: ${error.message}`);
    return false;
  }
};

/**
 * Run all detection checks
 */
const runDetectionChecks = async (userId, ipAddress, action, data = {}) => {
  try {
    const checks = [];

    // Run relevant checks based on action
    if (action === 'DocumentDownloaded') {
      checks.push(checkExcessiveDownloads(userId, ipAddress));
      if (data.documentId) {
        checks.push(checkFirstTimeAccess(userId, data.documentId, ipAddress));
        checks.push(checkRestrictedAccessAttempt(userId, data.documentId, ipAddress));
      }
    }

    if (action === 'DocumentViewed') {
      if (data.documentId) {
        checks.push(checkFirstTimeAccess(userId, data.documentId, ipAddress));
        checks.push(checkRestrictedAccessAttempt(userId, data.documentId, ipAddress));
      }
      checks.push(checkSequentialAccess(userId, ipAddress));
    }

    if (action === 'LoginFailed') {
      checks.push(checkMultipleIPLoginFailures(userId, ipAddress));
    }

    if (action === 'Login') {
      checks.push(checkUnusualAccessTime(userId, ipAddress));
    }

    // Run checks in parallel
    await Promise.all(checks);

    return { success: true };
  } catch (error) {
    logger.error(`Detection checks failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  runDetectionChecks,
  createAlert,
  RULES,
};