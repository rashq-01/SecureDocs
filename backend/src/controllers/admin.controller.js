const User = require('../models/User.model');
const Document = require('../models/Document.model');
const Case = require('../models/Case.model');
const AuditLog = require('../models/AuditLog.model');
const { writeAuditLog } = require('../services/audit.service');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Get dashboard statistics
 * GET /api/v1/admin/dashboard-stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalDocuments,
      pendingReviews,
      activeUsers,
      recentActivities,
    ] = await Promise.all([
      Document.countDocuments(),
      Document.countDocuments({ status: 'UnderReview' }),
      User.countDocuments({ isActive: true }),
      AuditLog.countDocuments({ 
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Get documents by status
    const statusCounts = await Document.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const documentsByStatus = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const stats = {
      totalDocuments,
      pendingReviews,
      activeUsers,
      recentActivities,
      documentsByStatus,
    };

    res.json(successResponse(stats, 'Dashboard stats retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get users list (Admin only)
 * GET /api/v1/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .populate('assignedCases', 'caseId title')
      .sort({ createdAt: -1 });

    res.json(successResponse(users, 'Users retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (Admin only)
 * PATCH /api/v1/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Role is required',
        400
      ));
    }

    const allowedRoles = ['Admin', 'IO', 'Reviewer', 'LegalLiaison', 'Auditor'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid role',
        400
      ));
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json(errorResponse(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        404
      ));
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Write audit log
    await writeAuditLog({
      actorId: req.user._id,
      action: 'UserRoleChanged',
      targetUserId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { 
        targetEmail: user.email,
        fromRole: oldRole,
        toRole: role,
      },
    });

    const responseUser = user.toObject();
    delete responseUser.passwordHash;

    res.json(successResponse(responseUser, 'User role updated'));
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active status (Admin only)
 * PATCH /api/v1/admin/users/:id/toggle-active
 */
const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json(errorResponse(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        404
      ));
    }

    user.isActive = !user.isActive;
    await user.save();

    // Write audit log
    await writeAuditLog({
      actorId: req.user._id,
      action: user.isActive ? 'UserActivated' : 'UserDeactivated',
      targetUserId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { 
        targetEmail: user.email,
        newStatus: user.isActive ? 'Active' : 'Deactivated',
      },
    });

    const responseUser = user.toObject();
    delete responseUser.passwordHash;

    res.json(successResponse(responseUser, `User ${user.isActive ? 'activated' : 'deactivated'}`));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserActive,
};