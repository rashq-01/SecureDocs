const { queryAuditLogs, verifyAuditIntegrity, getSecurityEvents } = require('../services/audit.service');
const { generateCSV, generatePDF } = require('../services/export.service');
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

/**
 * Export audit logs (Compliance Report)
 * GET /api/v1/audit-logs/export
 */
const exportAuditLogs = async (req, res, next) => {
  try {
    const {
      format = 'pdf',
      actorId,
      action,
      documentId,
      caseId,
      startDate,
      endDate,
      result,
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

    // Get ALL logs matching filter for export (no pagination)
    const options = {
      limit: 10000,
      skip: 0,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    };

    const resultData = await queryAuditLogs(filters, options);
    const logs = resultData.logs;

    let buffer;
    let contentType;
    let extension;

    // Build human-readable filters object for PDF header
    const readableFilters = {};
    if (action) readableFilters.action = action;
    if (caseId) readableFilters.caseId = caseId;
    if (startDate || endDate) readableFilters.dateRange = `${startDate || 'Start'} to ${endDate || 'Now'}`;

    if (format === 'csv') {
      buffer = generateCSV(logs);
      contentType = 'text/csv';
      extension = 'csv';
    } else {
      buffer = await generatePDF(logs, req.user, readableFilters);
      contentType = 'application/pdf';
      extension = 'pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=Compliance_Report_${new Date().toISOString().split('T')[0]}.${extension}`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  verifyIntegrity,
  getSecurityEventsEndpoint,
  exportAuditLogs,
};