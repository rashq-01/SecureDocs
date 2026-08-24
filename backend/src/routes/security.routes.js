const express = require('express');
const router = express.Router();
const { 
  getDashboard,
  getSuspiciousActivities,
  getRules,
  updateRules,
} = require('../controllers/securityDashboard.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

// Security dashboard (Admin only)
router.get(
  '/dashboard',
  verifyJWT,
  requireRole(['Admin']),
  getDashboard
);

// Suspicious activities (Admin only)
router.get(
  '/suspicious',
  verifyJWT,
  requireRole(['Admin']),
  getSuspiciousActivities
);

// Detection rules (Admin only)
router.get(
  '/rules',
  verifyJWT,
  requireRole(['Admin']),
  getRules
);

// Update rules (Admin only)
router.put(
  '/rules',
  verifyJWT,
  requireRole(['Admin']),
  updateRules
);

module.exports = router;