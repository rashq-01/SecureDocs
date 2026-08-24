const crypto = require('crypto');
const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

/**
 * Write an audit log entry with hash chain
 */
const writeAuditLog = async (data, options = {}) => {
  const { throwOnError = true, forceWrite = true } = options;
  
  try {
    const {
      actorId,
      action,
      targetDocumentId = null,
      targetCaseId = null,
      targetUserId = null,
      ipAddress = null,
      userAgent = null,
      result = 'Success',
      metadata = {},
    } = data;

    if (!actorId) {
      throw new Error('actorId is required for audit log');
    }
    if (!action) {
      throw new Error('action is required for audit log');
    }

    // Get the last audit log for hash chain
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
    const previousHash = lastLog?.hash || null;

    // Create the log entry
    const logEntry = new AuditLog({
      actorId,
      action,
      targetDocumentId,
      targetCaseId,
      targetUserId,
      ipAddress,
      userAgent,
      result,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      previousHash,
      timestamp: new Date(),
    });

    // Save with write concern for durability
    await logEntry.save({ writeConcern: { w: 'majority' } });
    
    logger.debug(`Audit log written: ${action} by ${actorId}`);
    return logEntry;
  } catch (error) {
    logger.error(`Failed to write audit log: ${error.message}`);
    
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    
    if (throwOnError) {
      throw error;
    }
    
    return null;
  }
};

/**
 * Write audit log with retry capability
 */
const writeAuditLogWithRetry = async (data, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await writeAuditLog(data, { throwOnError: true });
    } catch (error) {
      lastError = error;
      logger.warn(`Audit log write attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error(`Audit log write failed after ${maxRetries} attempts`);
  throw lastError;
};

/**
 * Query audit logs with filters
 */
const queryAuditLogs = async (filters = {}, options = {}) => {
  const {
    actorId,
    action,
    targetDocumentId,
    targetCaseId,
    targetUserId,
    startDate,
    endDate,
    result,
  } = filters;

  const {
    limit = 50,
    skip = 0,
    sortBy = 'timestamp',
    sortOrder = 'desc',
  } = options;

  const query = {};

  if (actorId) query.actorId = actorId;
  if (action) {
    if (Array.isArray(action)) {
      query.action = { $in: action };
    } else {
      query.action = action;
    }
  }
  if (targetDocumentId) query.targetDocumentId = targetDocumentId;
  if (targetCaseId) query.targetCaseId = targetCaseId;
  if (targetUserId) query.targetUserId = targetUserId;
  if (result) query.result = result;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actorId', 'name email role')
      .populate('targetDocumentId', 'title documentType status')
      .populate('targetCaseId', 'caseId title')
      .populate('targetUserId', 'name email role')
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return { logs, total, limit, skip };
};

/**
 * Verify audit log integrity (hash chain verification)
 */
const verifyAuditIntegrity = async () => {
  const logs = await AuditLog.find().sort({ timestamp: 1 });
  
  let previousHash = null;
  const results = [];
  let verified = true;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    // Check if hash matches
    const content = JSON.stringify({
      actorId: log.actorId?.toString() || '',
      action: log.action,
      targetDocumentId: log.targetDocumentId?.toString() || '',
      targetCaseId: log.targetCaseId?.toString() || '',
      targetUserId: log.targetUserId?.toString() || '',
      result: log.result,
      timestamp: log.timestamp?.toISOString() || '',
      metadata: log.metadata || {},
    });
    
    const expectedHash = crypto.createHash('sha256')
      .update((log.previousHash || '') + content)
      .digest('hex');
    
    const isValid = log.hash === expectedHash;
    
    if (!isValid) {
      verified = false;
      results.push({
        index: i,
        id: log._id,
        action: log.action,
        expectedHash,
        actualHash: log.hash,
        isValid: false,
      });
    }

    previousHash = log.hash;
  }

  return {
    verified,
    totalEntries: logs.length,
    results,
    message: verified 
      ? 'Audit log integrity verified successfully' 
      : 'Audit log integrity check failed! Some entries may be tampered.',
  };
};

/**
 * Get security events for dashboard
 */
const getSecurityEvents = async (timeframe = '24h') => {
  const timeMap = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const timeLimit = timeMap[timeframe] || timeMap['24h'];
  const since = new Date(Date.now() - timeLimit);

  const securityActions = [
    'LoginFailed',
    'UnauthorizedAccessAttempt',
    'TamperDetected',
    'SuspiciousActivity',
    'RateLimitExceeded',
    'AccessRequested',
    'AccessRejected',
    'ShareRevoked',
    'DocumentPermanentDeleted',
  ];

  const [events, stats] = await Promise.all([
    AuditLog.find({
      action: { $in: securityActions },
      timestamp: { $gte: since },
    })
      .populate('actorId', 'name email')
      .sort({ timestamp: -1 })
      .limit(100),
    AuditLog.aggregate([
      { $match: { action: { $in: securityActions }, timestamp: { $gte: since } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ]),
  ]);

  const statsMap = {};
  stats.forEach(s => { statsMap[s._id] = s.count; });

  return {
    events,
    stats: statsMap,
    total: events.length,
    timeframe,
  };
};

module.exports = {
  writeAuditLog,
  writeAuditLogWithRetry,
  queryAuditLogs,
  verifyAuditIntegrity,
  getSecurityEvents,
};