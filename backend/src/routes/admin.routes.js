const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserActive,
} = require('../controllers/admin.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck } = require('../middlewares/rbac.middleware');
const { body } = require('express-validator');

// Validation rules
const roleValidation = [
  body('role').isIn(['Admin', 'IO', 'Reviewer', 'LegalLiaison', 'Auditor'])
    .withMessage('Invalid role'),
];

// Routes
router.get(
  '/dashboard-stats',
  verifyJWT,
  rbacCheck('view'),
  getDashboardStats
);

router.get(
  '/users',
  verifyJWT,
  rbacCheck('manageUsers'),
  getUsers
);

router.patch(
  '/users/:id/role',
  verifyJWT,
  rbacCheck('manageRoles'),
  roleValidation,
  updateUserRole
);

router.patch(
  '/users/:id/toggle-active',
  verifyJWT,
  rbacCheck('manageUsers'),
  toggleUserActive
);

module.exports = router;