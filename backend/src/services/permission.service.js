const Document = require('../models/Document.model');
const User = require('../models/User.model');
const { writeAuditLog } = require('./audit.service');
const logger = require('../utils/logger');

// Permission types
const PERMISSIONS = {
  VIEW: 'VIEW',
  DOWNLOAD: 'DOWNLOAD',
  SHARE: 'SHARE',
  EDIT: 'EDIT',
  DELETE: 'DELETE',
};

// Permission hierarchy (higher = more access)
const PERMISSION_HIERARCHY = {
  VIEW: 1,
  DOWNLOAD: 2,
  SHARE: 3,
  EDIT: 4,
  DELETE: 5,
};

/**
 * Check if a user has a specific permission for a document
 */
const hasPermission = async (userId, documentId, permission) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return false;
    }

    // Check if document is deleted
    if (document.deletedAt) {
      return false;
    }

    // Admin has all permissions
    const user = await User.findById(userId);
    if (user && user.role === 'Admin') {
      return true;
    }

    // Check document-specific permissions
    const permissions = document.permissions || new Map();
    const userPermissions = permissions.get(userId.toString()) || [];
    
    // Check if user has the specific permission
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check if user has higher-level permission (e.g., DELETE implies EDIT)
    const requiredLevel = PERMISSION_HIERARCHY[permission];
    if (!requiredLevel) return false;

    for (const [key, value] of Object.entries(PERMISSION_HIERARCHY)) {
      if (value >= requiredLevel && userPermissions.includes(key)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error(`Permission check failed: ${error.message}`);
    return false;
  }
};

/**
 * Grant permission to a user for a document
 */
const grantPermission = async (documentId, userId, permission, grantedBy) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // Initialize permissions map if not exists
    if (!document.permissions) {
      document.permissions = new Map();
    }

    // Get existing permissions for user
    const userPermissions = document.permissions.get(userId.toString()) || [];
    
    // Add permission if not already granted
    if (!userPermissions.includes(permission)) {
      userPermissions.push(permission);
      document.permissions.set(userId.toString(), userPermissions);
      await document.save();
    }

    // Log the permission grant
    await writeAuditLog({
      actorId: grantedBy,
      action: 'PermissionGranted',
      targetDocumentId: documentId,
      result: 'Success',
      metadata: {
        action: 'GrantPermission',
        targetUserId: userId,
        permission,
      },
    });

    return document;
  } catch (error) {
    logger.error(`Permission grant failed: ${error.message}`);
    throw error;
  }
};

/**
 * Revoke permission from a user for a document
 */
const revokePermission = async (documentId, userId, permission, revokedBy) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (!document.permissions) {
      return document;
    }

    // Get existing permissions for user
    const userPermissions = document.permissions.get(userId.toString()) || [];
    
    // Remove permission
    const updatedPermissions = userPermissions.filter(p => p !== permission);
    
    if (updatedPermissions.length === 0) {
      document.permissions.delete(userId.toString());
    } else {
      document.permissions.set(userId.toString(), updatedPermissions);
    }
    
    await document.save();

    // Log the permission revocation
    await writeAuditLog({
      actorId: revokedBy,
      action: 'PermissionRevoked',
      targetDocumentId: documentId,
      result: 'Success',
      metadata: {
        action: 'RevokePermission',
        targetUserId: userId,
        permission,
      },
    });

    return document;
  } catch (error) {
    logger.error(`Permission revocation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get all permissions for a document
 */
const getDocumentPermissions = async (documentId) => {
  const document = await Document.findById(documentId);
  if (!document) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }

  return document.permissions || new Map();
};

/**
 * Get all documents a user has permission for
 */
const getUserDocuments = async (userId, permission = null) => {
  const documents = await Document.find({
    deletedAt: null,
  });

  const accessibleDocs = [];
  
  for (const doc of documents) {
    const permissions = doc.permissions || new Map();
    const userPermissions = permissions.get(userId.toString()) || [];
    
    if (permission) {
      if (userPermissions.includes(permission)) {
        accessibleDocs.push(doc);
      }
    } else if (userPermissions.length > 0) {
      accessibleDocs.push(doc);
    }
  }

  return accessibleDocs;
};

module.exports = {
  PERMISSIONS,
  PERMISSION_HIERARCHY,
  hasPermission,
  grantPermission,
  revokePermission,
  getDocumentPermissions,
  getUserDocuments,
};