const Share = require('../models/Share.model');
const Document = require('../models/Document.model');
const User = require('../models/User.model');
const { grantPermission } = require('./permission.service');
const { writeAuditLog } = require('./audit.service');
const { redisClient } = require('../config/redis');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Create a secure share link
 */
const createShare = async (documentId, sharedBy, sharedWith, permission, options = {}) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (document.deletedAt) {
      throw new Error('DOCUMENT_DELETED');
    }

    const user = await User.findById(sharedWith);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiresInHours = options.expiresInHours || 24;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const share = new Share({
      documentId,
      sharedBy,
      sharedWith,
      permission,
      shareToken,
      message: options.message || '',
      expiresAt,
      maxAccessCount: options.maxAccessCount || null,
    });

    await share.save();

    await grantPermission(documentId, sharedWith, permission, sharedBy);

    const ttlSeconds = expiresInHours * 60 * 60;
    await redisClient.setEx(
      `share:${shareToken}`,
      ttlSeconds,
      JSON.stringify({
        shareId: share._id.toString(),
        documentId: documentId.toString(),
        sharedWith: sharedWith.toString(),
        permission,
        expiresAt: expiresAt.toISOString(),
      })
    );

    await writeAuditLog({
      actorId: sharedBy,
      action: 'DocumentShared',
      targetDocumentId: documentId,
      result: 'Success',
      metadata: {
        shareId: share._id,
        sharedWith: user.email,
        permission,
        expiresAt,
      },
    });

    return share;
  } catch (error) {
    logger.error(`Share creation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get share by token
 */
const getShareByToken = async (shareToken) => {
  const share = await Share.findOne({ shareToken })
    .populate('documentId', 'title documentType fileHash status')
    .populate('sharedBy', 'name email')
    .populate('sharedWith', 'name email');

  if (!share) {
    throw new Error('SHARE_NOT_FOUND');
  }

  return share;
};

/**
 * Validate share token
 */
const validateShareToken = async (shareToken) => {
  try {
    const cached = await redisClient.get(`share:${shareToken}`);
    let share;

    if (cached) {
      const data = JSON.parse(cached);
      share = await Share.findById(data.shareId);
    } else {
      share = await Share.findOne({ shareToken });
    }

    if (!share) {
      return { valid: false, error: 'SHARE_NOT_FOUND' };
    }

    if (share.status === 'Revoked') {
      return { valid: false, error: 'SHARE_REVOKED' };
    }

    if (new Date(share.expiresAt) < new Date()) {
      share.status = 'Expired';
      await share.save();
      return { valid: false, error: 'SHARE_EXPIRED' };
    }

    if (share.maxAccessCount && share.accessCount >= share.maxAccessCount) {
      return { valid: false, error: 'SHARE_MAX_ACCESS_EXCEEDED' };
    }

    return { valid: true, data: share };
  } catch (error) {
    logger.error(`Share validation failed: ${error.message}`);
    return { valid: false, error: 'SHARE_INVALID' };
  }
};

/**
 * Access a shared document
 */
const accessShare = async (shareToken, userId) => {
  try {
    const validation = await validateShareToken(shareToken);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const share = validation.data;

    share.accessCount += 1;
    share.lastAccessedAt = new Date();
    await share.save();

    const ttlSeconds = Math.max(
      0,
      Math.floor((new Date(share.expiresAt) - new Date()) / 1000)
    );
    if (ttlSeconds > 0) {
      await redisClient.setEx(
        `share:${shareToken}`,
        ttlSeconds,
        JSON.stringify({
          shareId: share._id.toString(),
          documentId: share.documentId.toString(),
          sharedWith: share.sharedWith.toString(),
          permission: share.permission,
          expiresAt: share.expiresAt.toISOString(),
        })
      );
    }

    await writeAuditLog({
      actorId: userId,
      action: 'SharedDocumentAccessed',
      targetDocumentId: share.documentId,
      result: 'Success',
      metadata: {
        shareId: share._id,
        sharedBy: share.sharedBy,
        permission: share.permission,
      },
    });

    return share;
  } catch (error) {
    logger.error(`Share access failed: ${error.message}`);
    throw error;
  }
};

/**
 * Revoke a share
 */
const revokeShare = async (shareToken, actorId) => {
  try {
    const share = await Share.findOne({ shareToken });
    if (!share) {
      throw new Error('SHARE_NOT_FOUND');
    }

    share.status = 'Revoked';
    share.revokedAt = new Date();
    share.revokedBy = actorId;
    await share.save();

    await redisClient.del(`share:${shareToken}`);

    await writeAuditLog({
      actorId,
      action: 'ShareRevoked',
      targetDocumentId: share.documentId,
      result: 'Success',
      metadata: {
        shareId: share._id,
        sharedWith: share.sharedWith,
        permission: share.permission,
      },
    });

    return share;
  } catch (error) {
    logger.error(`Share revocation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get all shares for a user
 */
const getUserShares = async (userId, status = null) => {
  const query = { sharedWith: userId };
  if (status) {
    query.status = status;
  }

  const shares = await Share.find(query)
    .populate('documentId', 'title documentType fileHash status')
    .populate('sharedBy', 'name email')
    .sort({ createdAt: -1 });

  return shares;
};

/**
 * Get all shares created by a user
 */
const getSharesCreatedByUser = async (userId) => {
  const shares = await Share.find({ sharedBy: userId })
    .populate('documentId', 'title documentType')
    .populate('sharedWith', 'name email')
    .sort({ createdAt: -1 });

  return shares;
};

/**
 * Clean up expired shares
 */
const cleanupExpiredShares = async () => {
  try {
    const expiredShares = await Share.find({
      expiresAt: { $lt: new Date() },
      status: 'Active',
    });

    for (const share of expiredShares) {
      share.status = 'Expired';
      await share.save();
      await redisClient.del(`share:${share.shareToken}`);
    }

    logger.info(`Cleaned up ${expiredShares.length} expired shares`);
    return expiredShares.length;
  } catch (error) {
    logger.error(`Share cleanup failed: ${error.message}`);
    return 0;
  }
};

module.exports = {
  createShare,
  getShareByToken,
  validateShareToken,
  accessShare,
  revokeShare,
  getUserShares,
  getSharesCreatedByUser,
  cleanupExpiredShares,
};