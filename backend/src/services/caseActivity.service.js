const CaseActivity = require('../models/CaseActivity.model');
const { writeAuditLog } = require('./audit.service');
const logger = require('../utils/logger');

/**
 * Log a case activity
 */
const logCaseActivity = async (caseId, actorId, action, details = {}, ipAddress = null) => {
  try {
    const activity = new CaseActivity({
      caseId,
      actorId,
      action,
      details,
      ipAddress,
    });

    await activity.save();

    // Also write to audit log
    await writeAuditLog({
      actorId,
      action: `Case${action}`,
      targetCaseId: caseId,
      ipAddress,
      result: 'Success',
      metadata: details,
    });

    return activity;
  } catch (error) {
    logger.error(`Failed to log case activity: ${error.message}`);
    // Don't throw - activity logging shouldn't break the main flow
    return null;
  }
};

/**
 * Get case activities
 */
const getCaseActivities = async (caseId, options = {}) => {
  const { limit = 50, skip = 0 } = options;

  const query = CaseActivity.find({ caseId })
    .populate('actorId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const [activities, total] = await Promise.all([
    query,
    CaseActivity.countDocuments({ caseId }),
  ]);

  return { activities, total, limit, skip };
};

module.exports = {
  logCaseActivity,
  getCaseActivities,
};