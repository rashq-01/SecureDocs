const User = require('../models/User.model');
const Document = require('../models/Document.model');
const Case = require('../models/Case.model');
const AuditLog = require('../models/AuditLog.model');
const { writeAuditLog } = require('../services/audit.service');
const { hashPassword } = require('../services/auth.service');
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

    // If deactivated, force logout by emitting to their specific room
    if (!user.isActive) {
      const { getIO } = require('../sockets');
      try {
        const io = getIO();
        if (io) {
          io.to(`user_${user._id.toString()}`).emit('user:deactivated', {
            userId: user._id
          });
        }
      } catch (err) {
        logger.error(`Failed to emit user:deactivated socket event: ${err.message}`);
      }
    }

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

/**
 * Create a new user (Admin only)
 * POST /api/v1/admin/users
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Name, email, password, and role are required',
        400
      ));
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'User with this email already exists',
        400
      ));
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const newUser = new User({
      name,
      email,
      passwordHash,
      role,
      department,
      isActive: true,
      notificationPreferences: {
        emailNotifications: true,
        securityAlerts: true,
        documentUpdates: true,
      }
    });
    
    await newUser.save();
    
    // Write audit log
    await writeAuditLog({
      actorId: req.user._id,
      action: 'UserCreated',
      targetUserId: newUser._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { 
        createdEmail: newUser.email,
        role: newUser.role,
      },
    });
    
    const responseUser = newUser.toObject();
    delete responseUser.passwordHash;
    
    res.status(201).json(successResponse(responseUser, 'User created successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserActive,
  createUser,
};