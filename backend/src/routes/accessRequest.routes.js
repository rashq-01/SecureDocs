const express = require('express');
const router = express.Router();
const {
  createRequest,
  approveRequest,
  rejectRequest,
  getPending,
  getMyRequests,
  validateToken,
  revokeToken,
} = require('../controllers/accessRequest.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck, requireRole } = require('../middlewares/rbac.middleware');
const { accessRequestRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validateRequest.middleware');

// Create access request
router.post(
  '/',
  verifyJWT,
  accessRequestRateLimiter,
  [
    body('documentId').isMongoId().withMessage('Valid document ID is required'),
    body('permissionRequested').isIn(['VIEW', 'DOWNLOAD', 'SHARE', 'EDIT'])
      .withMessage('Invalid permission type'),
    body('justification').optional().isString().withMessage('Justification must be a string'),
  ],
  validateRequest,
  createRequest
);

// Approve request (Admin only)
router.patch(
  '/:id/approve',
  verifyJWT,
  requireRole(['Admin']),
  [
    body('expiresInDays').optional().isInt({ min: 1, max: 30 })
      .withMessage('Expiry must be between 1 and 30 days'),
  ],
  validateRequest,
  approveRequest
);

// Reject request (Admin only)
router.patch(
  '/:id/reject',
  verifyJWT,
  requireRole(['Admin']),
  [
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  validateRequest,
  rejectRequest
);

// Get pending requests for a document (Admin only)
router.get(
  '/document/:documentId/pending',
  verifyJWT,
  requireRole(['Admin']),
  getPending
);

// Get user's own requests
router.get(
  '/me',
  verifyJWT,
  getMyRequests
);

// Validate access token (public)
router.get(
  '/validate/:token',
  validateToken
);

// Revoke access token
router.post(
  '/revoke',
  verifyJWT,
  [
    body('token').notEmpty().withMessage('Token is required'),
  ],
  validateRequest,
  revokeToken
);

module.exports = router;