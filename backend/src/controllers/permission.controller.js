const {
  grantPermission: grantPermissionService,
  revokePermission: revokePermissionService,
  getDocumentPermissions: getDocumentPermissionsService,
  getUserDocuments,
  PERMISSIONS,
} = require('../services/permission.service');
const Document = require('../models/Document.model');
const User = require('../models/User.model');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/audit.service');
const logger = require('../utils/logger');

/**
 * Grant permission to a user
 * POST /api/v1/documents/:documentId/permissions/grant
 */
const grantPermission = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { userId, permission } = req.body;

    // Check if document exists
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        404
      ));
    }

    // Grant permission
    await grantPermissionService(documentId, userId, permission, req.user._id);

    // Log the permission grant
    await writeAuditLog({
      actorId: req.user._id,
      action: 'PermissionGranted',
      targetDocumentId: documentId,
      targetUserId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: {
        permission,
        grantedBy: req.user.email,
        grantedTo: user.email,
      },
    });

    res.json(successResponse(
      { documentId, userId, permission },
      `Permission ${permission} granted to ${user.email}`
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke permission from a user
 * POST /api/v1/documents/:documentId/permissions/revoke
 */
const revokePermission = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { userId, permission } = req.body;

    // Check if document exists
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        404
      ));
    }

    // Revoke permission
    await revokePermissionService(documentId, userId, permission, req.user._id);

    // Log the permission revocation
    await writeAuditLog({
      actorId: req.user._id,
      action: 'PermissionRevoked',
      targetDocumentId: documentId,
      targetUserId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: {
        permission,
        revokedBy: req.user.email,
        revokedFrom: user.email,
      },
    });

    res.json(successResponse(
      { documentId, userId, permission },
      `Permission ${permission} revoked from ${user.email}`
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Get all permissions for a document
 * GET /api/v1/documents/:documentId/permissions
 */
const getDocumentPermissions = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const permissions = await getDocumentPermissionsService(documentId);
    
    // Convert Map to plain object for response
    const permissionsObj = {};
    for (const [key, value] of permissions.entries()) {
      // Get user details for each permission
      const user = await User.findById(key).select('name email role');
      permissionsObj[key] = {
        user: user || { name: 'Unknown User', email: 'unknown' },
        permissions: value,
      };
    }

    res.json(successResponse(permissionsObj, 'Document permissions retrieved'));
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }
    next(error);
  }
};

/**
 * Get permissions for current user
 * GET /api/v1/documents/permissions/me
 */
const getUserPermissions = async (req, res, next) => {
  try {
    const documents = await getUserDocuments(req.user._id);
    
    const permissions = documents.map(doc => ({
      documentId: doc._id,
      title: doc.title,
      documentType: doc.documentType,
      status: doc.status,
      permissions: (doc.permissions || new Map()).get(req.user._id.toString()) || [],
    }));

    res.json(successResponse(permissions, 'Your permissions retrieved'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  grantPermission,
  revokePermission,
  getDocumentPermissions,
  getUserPermissions,
};