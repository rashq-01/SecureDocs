const AuditLog = require('../models/AuditLog.model');
const User = require('../models/User.model');
const Document = require('../models/Document.model');
const { getSecurityEvents } = require('./audit.service');
const logger = require('../utils/logger');

/**
 * Get security dashboard data
 */
const getSecurityDashboardData = async (userId) => {
  try {
    const timeframe = '24h';
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get security events
    const securityData = await getSecurityEvents(timeframe);

    // Get failed logins
    const failedLogins = await AuditLog.countDocuments({
      action: 'LoginFailed',
      timestamp: { $gte: since },
    });

    // Get unauthorized access attempts
    const unauthorizedAttempts = await AuditLog.countDocuments({
      action: 'UnauthorizedAccessAttempt',
      timestamp: { $gte: since },
    });

    // Get tamper detections
    const tamperDetections = await AuditLog.countDocuments({
      action: 'TamperDetected',
      timestamp: { $gte: since },
    });

    // Get suspicious activities
    const suspiciousActivities = await AuditLog.countDocuments({
      action: { $in: ['SuspiciousActivity', 'RateLimitExceeded'] },
      timestamp: { $gte: since },
    });

    // Get active users (last 24h)
    const activeUsers = await AuditLog.distinct('actorId', {
      timestamp: { $gte: since },
    });

    // Get recent alerts
    const recentAlerts = await AuditLog.find({
      action: {
        $in: [
          'TamperDetected',
          'SuspiciousActivity',
          'UnauthorizedAccessAttempt',
          'RateLimitExceeded',
        ],
      },
      timestamp: { $gte: since },
    })
      .populate('actorId', 'name email')
      .sort({ timestamp: -1 })
      .limit(50);

    // Get permission changes
    const permissionChanges = await AuditLog.countDocuments({
      action: { $in: ['PermissionGranted', 'PermissionRevoked'] },
      timestamp: { $gte: since },
    });

    // Get document stats
    const totalDocuments = await Document.countDocuments();
    const tamperedDocuments = await Document.countDocuments({ tamperFlag: true });

    return {
      summary: {
        failedLogins,
        unauthorizedAttempts,
        tamperDetections,
        suspiciousActivities,
        activeUsers: activeUsers.length,
        permissionChanges,
        totalDocuments,
        tamperedDocuments,
      },
      securityEvents: securityData.events || [],
      recentAlerts,
      stats: securityData.stats || {},
      timeframe,
    };
  } catch (error) {
    logger.error(`Security dashboard data fetch failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getSecurityDashboardData,
};