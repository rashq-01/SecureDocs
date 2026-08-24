const express = require('express');
const router = express.Router();
const {
  createCase,
  getCases,
  getCase,
  updateCase,
  updateCaseStatus,
  addMembers,
  removeMember,
  addTags,
  removeTags,
  getActivities,
  debugGetAllCases,
} = require('../controllers/case.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { rbacCheck, requireRole } = require('../middlewares/rbac.middleware');
const { sensitiveApiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validateRequest.middleware');

// Validation rules
const createCaseValidation = [
  body('caseId').notEmpty().withMessage('Case ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('department').notEmpty().withMessage('Department is required'),
];

const updateCaseValidation = [
  body('title').optional().isString().withMessage('Title must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid priority'),
  body('department').optional().isString().withMessage('Department must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
];

const statusValidation = [
  body('status').isIn(['Open', 'InProgress', 'UnderReview', 'Closed', 'Archived'])
    .withMessage('Invalid status'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
];

const membersValidation = [
  body('officerIds').isArray().withMessage('officerIds must be an array'),
];

const tagsValidation = [
  body('tags').isArray().withMessage('tags must be an array'),
];

// Routes
router.post(
  '/',
  verifyJWT,
  sensitiveApiRateLimiter,
  rbacCheck('createCase', { checkDocument: false }),
  createCaseValidation,
  validateRequest,
  createCase
);

router.get('/', verifyJWT, rbacCheck('view', { checkDocument: false }), getCases);


router.get('/:id', verifyJWT, rbacCheck('view', { checkDocument: false }), getCase);

router.put(
  '/:id',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  updateCaseValidation,
  validateRequest,
  updateCase
);

router.patch(
  '/:id/status',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  statusValidation,
  validateRequest,
  updateCaseStatus
);

router.post(
  '/:id/members',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  membersValidation,
  validateRequest,
  addMembers
);

router.delete(
  '/:id/members/:userId',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  removeMember
);

router.post(
  '/:id/tags',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  tagsValidation,
  validateRequest,
  addTags
);

router.delete(
  '/:id/tags',
  verifyJWT,
  sensitiveApiRateLimiter,
  requireRole(['Admin']),
  tagsValidation,
  validateRequest,
  removeTags
);

router.get(
  '/:id/activities',
  verifyJWT,
  rbacCheck('view', { checkDocument: false }),
  getActivities
);



// Debug route - list all cases (Admin only)
router.get(
  '/debug/all',
  verifyJWT,
  requireRole(['Admin']),
  debugGetAllCases
);

module.exports = router;