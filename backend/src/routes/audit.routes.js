const express = require('express');
const router = express.Router();
const { 
  getAuditLogs, 
  verifyIntegrity, 
  getSecurityEventsEndpoint,
  exportAuditLogs 
} = require('../controllers/audit.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck, requireRole } = require('../middlewares/rbac.middleware');
const { sensitiveApiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Get audit logs with filters
router.get(
  '/',
  verifyJWT,
  rbacCheck('viewAudit'),
  getAuditLogs
);

// Verify audit integrity (Admin only)
router.get(
  '/verify',
  verifyJWT,
  requireRole(['Admin']),
  sensitiveApiRateLimiter,
  verifyIntegrity
);

// Export compliance report
router.get(
  '/export',
  verifyJWT,
  rbacCheck('viewAudit'),
  exportAuditLogs
);

// Get security events (Admin only)
router.get(
  '/security-events',
  verifyJWT,
  requireRole(['Admin']),
  sensitiveApiRateLimiter,
  getSecurityEventsEndpoint
);

module.exports = router;