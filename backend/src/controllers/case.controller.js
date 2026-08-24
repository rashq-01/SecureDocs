const Case = require('../models/Case.model');
const User = require('../models/User.model');
const Document = require('../models/Document.model');
const { writeAuditLog } = require('../services/audit.service');
const { logCaseActivity, getCaseActivities } = require('../services/caseActivity.service');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Create a new case
 * POST /api/v1/cases
 */
const createCase = async (req, res, next) => {
  try {
    const { caseId, title, department, description, assignedOfficers = [], priority = 'Medium', tags = [] } = req.body;

    console.log('=== CREATE CASE ===');
    console.log('Request body:', req.body);

    // Validate required fields
    if (!caseId || !caseId.trim()) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Case ID is required',
        400
      ));
    }

    if (!title || !title.trim()) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Title is required',
        400
      ));
    }

    if (!department || !department.trim()) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Department is required',
        400
      ));
    }

    // Check for duplicate case ID
    const existing = await Case.findOne({ caseId: caseId.trim() });
    if (existing) {
      return res.status(400).json(errorResponse(
        ErrorCodes.DUPLICATE_ENTRY,
        'Case ID already exists',
        400
      ));
    }

    // Validate assigned officers exist
    let validOfficers = [];
    if (assignedOfficers && assignedOfficers.length > 0) {
      validOfficers = await User.find({ 
        _id: { $in: assignedOfficers },
        role: 'IO',
        isActive: true,
      });
    }

    const caseData = new Case({
      caseId: caseId.trim(),
      title: title.trim(),
      department: department.trim(),
      description: description ? description.trim() : '',
      assignedOfficers: validOfficers.map(u => u._id),
      createdBy: req.user._id,
      priority: priority || 'Medium',
      tags: Array.isArray(tags) ? tags : [],
      status: 'Open',
    });

    await caseData.save();
    await caseData.populate('assignedOfficers', 'name email');

    // Update assigned officers' cases
    if (validOfficers.length > 0) {
      await User.updateMany(
        { _id: { $in: validOfficers.map(u => u._id) } },
        { $addToSet: { assignedCases: caseData._id } }
      );
    }

    // Log activity
    await logCaseActivity(
      caseData._id,
      req.user._id,
      'Created',
      { 
        caseId: caseData.caseId,
        title: caseData.title,
        department: caseData.department,
        assignedOfficers: validOfficers.map(u => u.email),
        priority: caseData.priority,
        tags: caseData.tags,
      },
      req.ip
    );

    console.log('Case created successfully:', caseData.caseId);

    res.status(201).json(successResponse(caseData, 'Case created successfully'));
  } catch (error) {
    console.error('Error creating case:', error);
    next(error);
  }
};

/**
 * Get cases with filters
 * GET /api/v1/cases
 */
const getCases = async (req, res, next) => {
  try {
    const { status, department, priority, tag, search, limit = 50, skip = 0 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (department) query.department = department;
    if (priority) query.priority = priority;
    if (tag) query.tags = tag;
    
    if (search) {
      query.$or = [
        { caseId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Role-based filtering
    switch (req.user.role) {
      case 'Admin':
        // Admin sees all cases
        break;
      case 'IO': {
        // IO sees cases they are assigned to
        const assignedCaseIds = req.user.assignedCases || [];
        if (assignedCaseIds.length === 0) {
          return res.json(successResponse({
            cases: [],
            total: 0,
            limit: parseInt(limit),
            skip: parseInt(skip),
          }, 'Cases retrieved'));
        }
        query._id = { $in: assignedCaseIds };
        break;
      }
      case 'Reviewer': {
        // Reviewer sees cases in their department
        if (req.user.department) {
          query.department = req.user.department;
        } else {
          return res.json(successResponse({
            cases: [],
            total: 0,
            limit: parseInt(limit),
            skip: parseInt(skip),
          }, 'Cases retrieved'));
        }
        break;
      }
      case 'LegalLiaison':
      case 'Auditor':
        // Legal Liaison and Auditor can see all cases
        break;
      default:
        return res.json(successResponse({
          cases: [],
          total: 0,
          limit: parseInt(limit),
          skip: parseInt(skip),
        }, 'Cases retrieved'));
    }

    const [cases, total] = await Promise.all([
      Case.find(query)
        .populate('assignedOfficers', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip)),
      Case.countDocuments(query),
    ]);

    res.json(successResponse({
      cases,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    }, 'Cases retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single case
 * GET /api/v1/cases/:id
 */
const getCase = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format (24 hex characters)
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid case ID format. Expected 24 character hex string.',
        400
      ));
    }

    // Find the case. findById() casts `id` to an ObjectId, so it CANNOT match a
    // document whose _id was stored as a *string* (e.g. data brought in via
    // mongoimport / Compass "Import Data" / a JSON restore). Such docs still appear
    // in the list (getCases returns them), so a user can click one and hit a 404
    // here even though the record exists. Fall back to an uncast native lookup and
    // hydrate the result so populate()/toObject() still work.
    let caseData = await Case.findById(id)
      .populate('assignedOfficers', 'name email role')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!caseData) {
      // Native driver query does NOT cast, so this matches a String-typed _id.
      const raw = await Case.collection.findOne({ _id: id });
      if (raw) {
        caseData = await Case.populate(Case.hydrate(raw), [
          { path: 'assignedOfficers', select: 'name email role' },
          { path: 'createdBy', select: 'name email' },
          { path: 'updatedBy', select: 'name email' },
        ]);
      }
    }

    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    // Check access based on role
    let hasAccess = false;
    
    switch (req.user.role) {
      case 'Admin':
        hasAccess = true;
        break;
      case 'IO':
        hasAccess = caseData.assignedOfficers.some(
          officer => officer._id.toString() === req.user._id.toString()
        );
        break;
      case 'Reviewer':
        hasAccess = caseData.department === req.user.department;
        break;
      case 'LegalLiaison':
        hasAccess = true;
        break;
      case 'Auditor':
        hasAccess = true;
        break;
      default:
        hasAccess = false;
    }

    if (!hasAccess) {
      return res.status(403).json(errorResponse(
        ErrorCodes.RBAC_DENIED,
        'You do not have permission to view this case',
        403
      ));
    }

    // Get document count
    let documentCount = 0;
    try {
      documentCount = await Document.countDocuments({ caseId: id });
    } catch (err) {
      console.error('Error counting documents:', err);
    }

    // Return the case
    const responseData = {
      ...caseData.toObject(),
      documentCount,
    };

    res.json(successResponse(responseData, 'Case retrieved'));
  } catch (error) {
    console.error('Error in getCase:', error);
    console.error('Error stack:', error.stack);
    next(error);
  }
};

/**
 * Update case
 * PUT /api/v1/cases/:id
 */
const updateCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, priority, tags, department } = req.body;

    const caseData = await Case.findById(id);
    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    const updates = {};
    const changes = [];

    if (title && title !== caseData.title) {
      updates.title = title;
      changes.push({ field: 'title', from: caseData.title, to: title });
    }
    if (description && description !== caseData.description) {
      updates.description = description;
      changes.push({ field: 'description', from: caseData.description, to: description });
    }
    if (priority && priority !== caseData.priority) {
      updates.priority = priority;
      changes.push({ field: 'priority', from: caseData.priority, to: priority });
    }
    if (department && department !== caseData.department) {
      updates.department = department;
      changes.push({ field: 'department', from: caseData.department, to: department });
    }
    if (tags && Array.isArray(tags)) {
      const oldTags = caseData.tags || [];
      updates.tags = tags;
      changes.push({ field: 'tags', from: oldTags, to: tags });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'No updates provided',
        400
      ));
    }

    updates.updatedBy = req.user._id;
    Object.assign(caseData, updates);
    await caseData.save();

    // Log activity
    await logCaseActivity(
      caseData._id,
      req.user._id,
      'Updated',
      { changes },
      req.ip
    );

    await caseData.populate('assignedOfficers', 'name email');

    res.json(successResponse(caseData, 'Case updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update case status
 * PATCH /api/v1/cases/:id/status
 */
const updateCaseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || !['Open', 'InProgress', 'UnderReview', 'Closed', 'Archived'].includes(status)) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid status. Must be Open, InProgress, UnderReview, Closed, or Archived',
        400
      ));
    }

    const caseData = await Case.findById(id);
    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    const oldStatus = caseData.status;
    caseData.status = status;
    caseData.updatedBy = req.user._id;

    if (status === 'Closed') {
      caseData.closedAt = new Date();
    }
    if (status === 'Archived') {
      caseData.archivedAt = new Date();
    }

    await caseData.save();

    // Log activity
    await logCaseActivity(
      caseData._id,
      req.user._id,
      'StatusChanged',
      { fromStatus: oldStatus, toStatus: status, reason },
      req.ip
    );

    res.json(successResponse(caseData, 'Case status updated'));
  } catch (error) {
    next(error);
  }
};

/**
 * Add members to case
 * POST /api/v1/cases/:id/members
 */
const addMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { officerIds } = req.body;

    if (!officerIds || !Array.isArray(officerIds) || officerIds.length === 0) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'officerIds array is required',
        400
      ));
    }

    const caseData = await Case.findById(id);
    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    // Validate officers
    const officers = await User.find({
      _id: { $in: officerIds },
      role: 'IO',
      isActive: true,
    });

    if (officers.length !== officerIds.length) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Some officers not found or not IO role',
        400
      ));
    }

    // Add new officers
    const existingIds = caseData.assignedOfficers.map(id => id.toString());
    const newOfficers = officers.filter(
      o => !existingIds.includes(o._id.toString())
    );

    if (newOfficers.length === 0) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Officers already assigned',
        400
      ));
    }

    caseData.assignedOfficers.push(...newOfficers.map(o => o._id));
    caseData.updatedBy = req.user._id;
    await caseData.save();

    // Update users' assigned cases
    await User.updateMany(
      { _id: { $in: newOfficers.map(o => o._id) } },
      { $addToSet: { assignedCases: caseData._id } }
    );

    // Log activity
    await logCaseActivity(
      caseData._id,
      req.user._id,
      'MemberAdded',
      { addedMembers: newOfficers.map(o => o.email) },
      req.ip
    );

    await caseData.populate('assignedOfficers', 'name email');

    res.json(successResponse(caseData, 'Members added successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from case
 * DELETE /api/v1/cases/:id/members/:userId
 */
const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const caseData = await Case.findById(id);
    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    // Check if member is assigned
    if (!caseData.isAssignedTo(userId)) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Member not assigned to this case',
        400
      ));
    }

    // Remove member
    caseData.assignedOfficers = caseData.assignedOfficers.filter(
      id => id.toString() !== userId
    );
    caseData.updatedBy = req.user._id;
    await caseData.save();

    // Remove case from user's assigned cases
    await User.findByIdAndUpdate(userId, {
      $pull: { assignedCases: caseData._id }
    });

    // Get user details for logging
    const user = await User.findById(userId);

    // Log activity
    await logCaseActivity(
      caseData._id,
      req.user._id,
      'MemberRemoved',
      { removedMember: user?.email || userId },
      req.ip
    );

    await caseData.populate('assignedOfficers', 'name email');

    res.json(successResponse(caseData, 'Member removed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Add tags to case
 * POST /api/v1/cases/:id/tags
 */
const addTags = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'tags array is required',
        400
      ));
    }

    const caseData = await Case.findById(id);
    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    const existingTags = caseData.tags || [];
    const newTags = tags.filter(t => !existingTags.includes(t));

    if (newTags.length === 0) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Tags already exist on this case',
        400
      ));
    }

    caseData.tags = [...existingTags, ...newTags];
    caseData.updatedBy = req.user._id;
    await caseData.save();

    // Log activity
    await logCaseActivity(
      caseData._id,
      req.user._id,
      'TagAdded',
      { tags: newTags },
      req.ip
    );

    res.json(successResponse(caseData, 'Tags added successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Remove tags from case
 * DELETE /api/v1/cases/:id/tags
 */
const removeTags = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'tags array is required',
        400
      ));
    }

    const caseData = await Case.findById(id);
    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    const currentTags = caseData.tags || [];
    const removedTags = tags.filter(t => currentTags.includes(t));

    if (removedTags.length === 0) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Tags not found on this case',
        400
      ));
    }

    caseData.tags = currentTags.filter(t => !removedTags.includes(t));
    caseData.updatedBy = req.user._id;
    await caseData.save();

    // Log activity
    await logCaseActivity(
      caseData._id,
      req.user._id,
      'TagRemoved',
      { tags: removedTags },
      req.ip
    );

    res.json(successResponse(caseData, 'Tags removed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get case activities
 * GET /api/v1/cases/:id/activities
 */
const getActivities = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const { activities, total } = await getCaseActivities(id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json(successResponse({
      activities,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    }, 'Case activities retrieved'));
  } catch (error) {
    next(error);
  }
};


/**
 * Debug - Get all cases (Admin only)
 * GET /api/v1/cases/debug/all
 */
const debugGetAllCases = async (req, res, next) => {
  try {
    const allCases = await Case.find({})
      .populate('assignedOfficers', 'name email')
      .populate('createdBy', 'name email');
    
    console.log('=== DEBUG: ALL CASES ===');
    console.log(`Found ${allCases.length} cases`);
    allCases.forEach(c => {
      console.log(`- ${c.caseId} (${c._id}): ${c.title}`);
    });
    
    res.json(successResponse({
      count: allCases.length,
      cases: allCases.map(c => ({
        id: c._id,
        caseId: c.caseId,
        title: c.title,
        department: c.department,
        status: c.status
      }))
    }, 'Debug - all cases'));
  } catch (error) {
    console.error('Debug error:', error);
    next(error);
  }
};

// Add to exports
module.exports = {
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
};