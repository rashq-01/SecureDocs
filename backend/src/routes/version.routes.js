const express = require('express');
const router = express.Router();
const { 
  getVersions, 
  getVersion, 
  downloadVersion,
  previewVersion,
  createNewVersion 
} = require('../controllers/version.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck } = require('../middlewares/rbac.middleware');
const { downloadRateLimiter } = require('../middlewares/rateLimiter.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validateRequest.middleware');

// Get all versions of a document
router.get('/:documentId/versions', verifyJWT, rbacCheck('view'), getVersions);

// Get a specific version
router.get('/:documentId/versions/:versionNumber', verifyJWT, rbacCheck('view'), getVersion);

// Download a specific version
router.get(
  '/:documentId/versions/:versionNumber/download',
  verifyJWT,
  downloadRateLimiter,
  rbacCheck('download'),
  downloadVersion
);

// Preview a specific version
router.get(
  '/:documentId/versions/:versionNumber/preview',
  verifyJWT,
  rbacCheck('view'),
  previewVersion
);

// Create a new version
router.post(
  '/:documentId/versions',
  verifyJWT,
  rbacCheck('upload'),
  uploadMiddleware('file'),
  [
    body('changelog').optional().isString().withMessage('Changelog must be a string'),
  ],
  validateRequest,
  createNewVersion
);

module.exports = router;