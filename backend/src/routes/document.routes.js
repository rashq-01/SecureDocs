const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getDocuments,
  getDocument,
  downloadDocument,
  previewDocument,
  updateStatus,
  verifySignature,
} = require('../controllers/document.controller');
const {
  archive,
  softDelete,
  restore,
  permanentDelete,
  getDeleted,
  getArchived,
} = require('../controllers/documentDeletion.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck, requireRole } = require('../middlewares/rbac.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const { 
  uploadRateLimiter, 
  downloadRateLimiter,
  sensitiveApiRateLimiter 
} = require('../middlewares/rateLimiter.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validateRequest.middleware');

// Validation rules
const uploadValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('caseId').notEmpty().withMessage('Case ID is required'),
  body('documentType').notEmpty().withMessage('Document type is required'),
];

const statusValidation = [
  body('status').isIn(['Draft', 'UnderReview', 'Approved', 'Rejected', 'Archived'])
    .withMessage('Invalid status'),
];

// Deletion validation
const deletionValidation = [
  body('reason').optional().isString().withMessage('Reason must be a string'),
];

// Routes
router.post(
  '/',
  verifyJWT,
  uploadRateLimiter,
  rbacCheck('upload'),
  uploadMiddleware('file'),
  uploadValidation,
  validateRequest,
  uploadDocument
);

// GET documents - uses view permission
router.get('/', verifyJWT, rbacCheck('view'), getDocuments);

// GET deleted documents (Admin only)
router.get(
  '/deleted',
  verifyJWT,
  requireRole(['Admin']),
  getDeleted
);

// GET archived documents (Admin only)
router.get(
  '/archived',
  verifyJWT,
  requireRole(['Admin']),
  getArchived
);

// GET single document
router.get('/:id', verifyJWT, rbacCheck('view'), getDocument);

// GET download
router.get(
  '/:id/download',
  verifyJWT,
  downloadRateLimiter,
  rbacCheck('download'),
  downloadDocument
);

// GET preview
router.get(
  '/:id/preview',
  verifyJWT,
  downloadRateLimiter,
  rbacCheck('view'),
  previewDocument
);

// GET verify signature
router.get(
  '/:id/verify-signature',
  verifyJWT,
  rbacCheck('view'),
  verifySignature
);

// PATCH status
router.patch(
  '/:id/status',
  verifyJWT,
  sensitiveApiRateLimiter,
  rbacCheck('changeStatus'),
  statusValidation,
  validateRequest,
  updateStatus
);

// Archive (soft delete)
router.post(
  '/:id/archive',
  verifyJWT,
  sensitiveApiRateLimiter,
  rbacCheck('deleteDocument'),
  deletionValidation,
  validateRequest,
  archive
);

// Soft delete
router.post(
  '/:id/delete',
  verifyJWT,
  sensitiveApiRateLimiter,
  rbacCheck('deleteDocument'),
  deletionValidation,
  validateRequest,
  softDelete
);

// Restore (Admin only)
router.post(
  '/:id/restore',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  deletionValidation,
  validateRequest,
  restore
);

// Permanent delete (Admin only)
router.delete(
  '/:id/permanent',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  permanentDelete
);

module.exports = router;