const AccessRequest = require('../models/AccessRequest.model');
const Document = require('../models/Document.model');
const User = require('../models/User.model');
const { grantPermission } = require('./permission.service');
const { writeAuditLog } = require('./audit.service');
const { redisClient } = require('../config/redis');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Create a new access request
 */
const createAccessRequest = async (documentId, requesterId, permissionRequested, justification = '') => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // Check if document is deleted
    if (document.deletedAt) {
      throw new Error('DOCUMENT_DELETED');
    }

    // Check if user already has pending request
    const existingRequest = await AccessRequest.findOne({
      documentId,
      requesterId,
      status: 'Pending',
    });

    if (existingRequest) {
      throw new Error('REQUEST_ALREADY_PENDING');
    }

    // Generate access token
    const accessToken = crypto.randomBytes(32).toString('hex');

    const request = new AccessRequest({
      documentId,
      requesterId,
      permissionRequested,
      justification,
      accessToken,
      status: 'Pending',
    });

    await request.save();

    // Log the request
    await writeAuditLog({
      actorId: requesterId,
      action: 'AccessRequested',
      targetDocumentId: documentId,
      result: 'Success',
      metadata: {
        requestId: request._id,
        permissionRequested,
        justification,
        accessToken: accessToken.substring(0, 20) + '...',
      },
    });

    return request;
  } catch (error) {
    logger.error(`Access request creation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Approve an access request
 */
const approveAccessRequest = async (requestId, approverId, expiresInDays = 7) => {
  try {
    const request = await AccessRequest.findById(requestId);
    if (!request) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    if (request.status !== 'Pending') {
      throw new Error('REQUEST_ALREADY_PROCESSED');
    }

    // Check if approver has permission to approve (Admin or document owner)
    const document = await Document.findById(request.documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // Grant permission
    await grantPermission(
      request.documentId,
      request.requesterId,
      request.permissionRequested,
      approverId
    );

    // Update request
    request.status = 'Approved';
    request.approverId = approverId;
    request.approvedAt = new Date();
    request.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    await request.save();

    // Store access token in Redis with TTL
    const ttlSeconds = expiresInDays * 24 * 60 * 60;
    await redisClient.setEx(
      `access:${request.accessToken}`,
      ttlSeconds,
      JSON.stringify({
        requestId: request._id.toString(),
        documentId: request.documentId.toString(),
        requesterId: request.requesterId.toString(),
        permission: request.permissionRequested,
      })
    );

    // Log the approval
    await writeAuditLog({
      actorId: approverId,
      action: 'AccessApproved',
      targetDocumentId: request.documentId,
      result: 'Success',
      metadata: {
        requestId: request._id,
        requesterId: request.requesterId,
        permissionRequested: request.permissionRequested,
        expiresAt: request.expiresAt,
      },
    });

    return request;
  } catch (error) {
    logger.error(`Access approval failed: ${error.message}`);
    throw error;
  }
};

/**
 * Reject an access request
 */
const rejectAccessRequest = async (requestId, approverId, reason = '') => {
  try {
    const request = await AccessRequest.findById(requestId);
    if (!request) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    if (request.status !== 'Pending') {
      throw new Error('REQUEST_ALREADY_PROCESSED');
    }

    request.status = 'Rejected';
    request.approverId = approverId;
    request.rejectedAt = new Date();
    request.rejectedReason = reason;
    await request.save();

    // Log the rejection
    await writeAuditLog({
      actorId: approverId,
      action: 'AccessRejected',
      targetDocumentId: request.documentId,
      result: 'Success',
      metadata: {
        requestId: request._id,
        requesterId: request.requesterId,
        permissionRequested: request.permissionRequested,
        reason,
      },
    });

    return request;
  } catch (error) {
    logger.error(`Access rejection failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get all pending requests for a document
 */
const getPendingRequests = async (documentId) => {
  const requests = await AccessRequest.find({
    documentId,
    status: 'Pending',
  })
    .populate('requesterId', 'name email role')
    .populate('documentId', 'title documentType')
    .sort({ createdAt: -1 });

  return requests;
};

/**
 * Get all requests for a user
 */
const getUserRequests = async (userId, status = null) => {
  const query = { requesterId: userId };
  if (status) {
    query.status = status;
  }

  const requests = await AccessRequest.find(query)
    .populate('documentId', 'title documentType caseId')
    .populate('approverId', 'name email')
    .sort({ createdAt: -1 });

  return requests;
};

/**
 * Validate an access token
 */
const validateAccessToken = async (accessToken, documentId) => {
  try {
    const data = await redisClient.get(`access:${accessToken}`);
    if (!data) {
      return { valid: false, error: 'TOKEN_EXPIRED' };
    }

    const tokenData = JSON.parse(data);
    if (tokenData.documentId !== documentId) {
      return { valid: false, error: 'TOKEN_INVALID' };
    }

    return { 
      valid: true, 
      data: tokenData,
      permission: tokenData.permission,
    };
  } catch (error) {
    logger.error(`Token validation failed: ${error.message}`);
    return { valid: false, error: 'TOKEN_INVALID' };
  }
};

/**
 * Revoke an access token
 */
const revokeAccessToken = async (accessToken, actorId) => {
  try {
    await redisClient.del(`access:${accessToken}`);
    
    // Log the revocation
    await writeAuditLog({
      actorId,
      action: 'AccessRevoked',
      result: 'Success',
      metadata: {
        action: 'TokenRevoked',
        accessToken: accessToken.substring(0, 20) + '...',
      },
    });

    return { success: true };
  } catch (error) {
    logger.error(`Token revocation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Clean up expired access tokens
 */
const cleanupExpiredTokens = async () => {
  try {
    const expiredRequests = await AccessRequest.find({
      expiresAt: { $lt: new Date() },
      status: 'Approved',
    });

    for (const request of expiredRequests) {
      if (request.accessToken) {
        await redisClient.del(`access:${request.accessToken}`);
      }
      request.status = 'Expired';
      await request.save();
    }

    logger.info(`Cleaned up ${expiredRequests.length} expired access tokens`);
    return expiredRequests.length;
  } catch (error) {
    logger.error(`Cleanup failed: ${error.message}`);
    return 0;
  }
};

module.exports = {
  createAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  getPendingRequests,
  getUserRequests,
  validateAccessToken,
  revokeAccessToken,
  cleanupExpiredTokens,
};