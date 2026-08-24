const express = require('express');
const router = express.Router();
const {
  grantPermission,
  revokePermission,
  getDocumentPermissions,
  getUserPermissions,
} = require('../controllers/permission.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck, requireRole } = require('../middlewares/rbac.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validateRequest.middleware');

// Grant permission to user
router.post(
  '/:documentId/permissions/grant',
  verifyJWT,
  requireRole(['Admin']),
  [
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('permission').isIn(['VIEW', 'DOWNLOAD', 'SHARE', 'EDIT', 'DELETE'])
      .withMessage('Invalid permission type'),
  ],
  validateRequest,
  grantPermission
);

// Revoke permission from user
router.post(
  '/:documentId/permissions/revoke',
  verifyJWT,
  requireRole(['Admin']),
  [
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('permission').isIn(['VIEW', 'DOWNLOAD', 'SHARE', 'EDIT', 'DELETE'])
      .withMessage('Invalid permission type'),
  ],
  validateRequest,
  revokePermission
);

// Get all permissions for a document
router.get(
  '/:documentId/permissions',
  verifyJWT,
  rbacCheck('view'),
  getDocumentPermissions
);

// Get all permissions for current user
router.get(
  '/permissions/me',
  verifyJWT,
  getUserPermissions
);

module.exports = router;