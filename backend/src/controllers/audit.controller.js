const { queryAuditLogs, verifyAuditIntegrity, getSecurityEvents } = require('../services/audit.service');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');

/**
 * Get audit logs with filters
 * GET /api/v1/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const {
      actorId,
      action,
      documentId,
      caseId,
      startDate,
      endDate,
      result,
      limit = 50,
      skip = 0,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query;

    const filters = {
      actorId,
      action,
      targetDocumentId: documentId,
      targetCaseId: caseId,
      startDate,
      endDate,
      result,
    };

    const options = {
      limit: Math.min(parseInt(limit), 100),
      skip: parseInt(skip),
      sortBy,
      sortOrder,
    };

    const resultData = await queryAuditLogs(filters, options);

    res.json(successResponse(resultData, 'Audit logs retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Verify audit log integrity
 * GET /api/v1/audit-logs/verify
 */
const verifyIntegrity = async (req, res, next) => {
  try {
    // Only Admin can verify audit integrity
    if (req.user.role !== 'Admin') {
      return res.status(403).json(errorResponse(
        ErrorCodes.RBAC_DENIED,
        'Only Admin can verify audit integrity',
        403
      ));
    }

    const result = await verifyAuditIntegrity();

    res.json(successResponse(result, 'Audit integrity verification completed'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get security events
 * GET /api/v1/audit-logs/security-events
 */
const getSecurityEventsEndpoint = async (req, res, next) => {
  try {
    const { timeframe = '24h' } = req.query;

    const result = await getSecurityEvents(timeframe);

    res.json(successResponse(result, 'Security events retrieved'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  verifyIntegrity,
  getSecurityEventsEndpoint,
};