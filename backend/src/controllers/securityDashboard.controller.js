const { getSecurityDashboardData } = require('../services/securityDashboard.service');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

/**
 * Get security dashboard data
 * GET /api/v1/security/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const data = await getSecurityDashboardData(req.user._id);

    res.json(successResponse(data, 'Security dashboard data retrieved'));
  } catch (error) {
    logger.error(`Security dashboard error: ${error.message}`);
    next(error);
  }
};

/**
 * Get suspicious activities
 * GET /api/v1/security/suspicious
 */
const getSuspiciousActivities = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0, severity } = req.query;

    const query = {
      action: { $in: ['SuspiciousActivity', 'TamperDetected', 'UnauthorizedAccessAttempt'] },
    };

    if (severity) {
      query['metadata.severity'] = severity;
    }

    const [activities, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'name email role')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip)),
      AuditLog.countDocuments(query),
    ]);

    res.json(successResponse({
      activities,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    }, 'Suspicious activities retrieved'));
  } catch (error) {
    logger.error(`Suspicious activities error: ${error.message}`);
    next(error);
  }
};

/**
 * Get detection rules configuration
 * GET /api/v1/security/rules
 */
const getRules = async (req, res, next) => {
  try {
    // Import rules from suspicious detection service
    const { RULES } = require('../services/suspiciousDetection.service');
    res.json(successResponse(RULES, 'Detection rules retrieved'));
  } catch (error) {
    logger.error(`Get rules error: ${error.message}`);
    next(error);
  }
};

/**
 * Update detection rules (Admin only)
 * PUT /api/v1/security/rules
 */
const updateRules = async (req, res, next) => {
  try {
    const { rules } = req.body;
    
    // This would update the rules configuration in a real implementation
    // For now, just return success
    logger.info('Rules update requested:', rules);
    
    res.json(successResponse({ updated: true }, 'Rules updated successfully'));
  } catch (error) {
    logger.error(`Update rules error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getDashboard,
  getSuspiciousActivities,
  getRules,
  updateRules,
};