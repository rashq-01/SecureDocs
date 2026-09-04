const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserActive,
  createUser,
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
  rbacCheck('view', { checkDocument: false }),
  getUsers
);

router.post(
  '/users',
  verifyJWT,
  rbacCheck('manageUsers'),
  createUser
);

router.patch(
  '/users/:id/role',
  verifyJWT,
  rbacCheck('manageRoles', { checkDocument: false }),
  roleValidation,
  updateUserRole
);

router.patch(
  '/users/:id/toggle-active',
  verifyJWT,
  rbacCheck('manageUsers', { checkDocument: false }),
  toggleUserActive
);

module.exports = router;