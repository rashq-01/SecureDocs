const express = require('express');
const router = express.Router();
const {
  createShareLink,
  getShare,
  accessShareLink,
  revokeShareLink,
  getMyShares,
  getSharesCreatedByMe,
  validateShare,
} = require('../controllers/share.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck } = require('../middlewares/rbac.middleware');
const { shareRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validateRequest.middleware');

// Create share (requires SHARE permission on document)
router.post(
  '/',
  verifyJWT,
  shareRateLimiter,
  rbacCheck('share'),
  [
    body('documentId').isMongoId().withMessage('Valid document ID is required'),
    body('sharedWith').isMongoId().withMessage('Valid user ID is required'),
    body('permission').isIn(['VIEW', 'DOWNLOAD', 'SHARE', 'EDIT'])
      .withMessage('Invalid permission type'),
    body('expiresInHours').optional({ nullable: true }).isInt({ min: 1, max: 168 })
      .withMessage('Expiry must be between 1 and 168 hours'),
    body('message').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Message must be a string'),
    body('maxAccessCount').optional({ nullable: true }).isInt({ min: 1 })
      .withMessage('Max access count must be at least 1'),
  ],
  validateRequest,
  createShareLink
);

// Get user's received shares
router.get('/me', verifyJWT, getMyShares);

// Get shares created by user
router.get('/created-by-me', verifyJWT, getSharesCreatedByMe);

// Validate share token (public)
router.get('/validate/:token', validateShare);

// Get share details
router.get('/:token', verifyJWT, getShare);

// Access share (requires authentication)
router.get('/access/:token', verifyJWT, accessShareLink);

// Revoke share
router.delete('/:token/revoke', verifyJWT, revokeShareLink);

module.exports = router;