const {
  createShare,
  getShareByToken,
  validateShareToken,
  accessShare,
  revokeShare,
  getUserShares,
  getSharesCreatedByUser,
} = require('../services/share.service');
const Document = require('../models/Document.model');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Create a share
 * POST /api/v1/shares
 */
const createShareLink = async (req, res, next) => {
  try {
    const { documentId, sharedWith, permission, expiresInHours, message, maxAccessCount } = req.body;

    // Check if document exists and user has permission to share
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    const share = await createShare(
      documentId,
      req.user._id,
      sharedWith,
      permission,
      {
        expiresInHours: expiresInHours || 24,
        message: message || '',
        maxAccessCount: maxAccessCount || null,
      }
    );

    res.status(201).json(successResponse({
      share,
      shareLink: `/api/v1/shares/access/${share.shareToken}`,
    }, 'Share created successfully'));
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }
    if (error.message === 'DOCUMENT_DELETED') {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Document has been deleted',
        400
      ));
    }
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        404
      ));
    }
    next(error);
  }
};

/**
 * Get share details
 * GET /api/v1/shares/:token
 */
const getShare = async (req, res, next) => {
  try {
    const { token } = req.params;

    const share = await getShareByToken(token);

    res.json(successResponse(share, 'Share details retrieved'));
  } catch (error) {
    if (error.message === 'SHARE_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Share not found',
        404
      ));
    }
    next(error);
  }
};

/**
 * Access a share (redirect to document)
 * GET /api/v1/shares/access/:token
 */
const accessShareLink = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_MISSING,
        'Authentication required to access shared document',
        401
      ));
    }

    const share = await accessShare(token, userId);

    res.json(successResponse({
      documentId: share.documentId,
      permission: share.permission,
      document: share.documentId,
    }, 'Share accessed successfully'));
  } catch (error) {
    if (error.message === 'SHARE_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Share not found',
        404
      ));
    }
    if (error.message === 'SHARE_EXPIRED') {
      return res.status(410).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Share has expired',
        410
      ));
    }
    if (error.message === 'SHARE_REVOKED') {
      return res.status(410).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Share has been revoked',
        410
      ));
    }
    if (error.message === 'SHARE_MAX_ACCESS_EXCEEDED') {
      return res.status(429).json(errorResponse(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        'Share access limit exceeded',
        429
      ));
    }
    next(error);
  }
};

/**
 * Revoke a share
 * DELETE /api/v1/shares/:token/revoke
 */
const revokeShareLink = async (req, res, next) => {
  try {
    const { token } = req.params;

    await revokeShare(token, req.user._id);

    res.json(successResponse(null, 'Share revoked successfully'));
  } catch (error) {
    if (error.message === 'SHARE_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Share not found',
        404
      ));
    }
    next(error);
  }
};

/**
 * Get user's shares
 * GET /api/v1/shares/me
 */
const getMyShares = async (req, res, next) => {
  try {
    const { status } = req.query;

    const shares = await getUserShares(req.user._id, status);

    res.json(successResponse(shares, 'Your shares retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get shares created by user
 * GET /api/v1/shares/created-by-me
 */
const getSharesCreatedByMe = async (req, res, next) => {
  try {
    const shares = await getSharesCreatedByUser(req.user._id);

    res.json(successResponse(shares, 'Shares you created retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Validate share token (public)
 * GET /api/v1/shares/validate/:token
 */
const validateShare = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await validateShareToken(token);

    if (!result.valid) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        result.error,
        400
      ));
    }

    res.json(successResponse({
      documentId: result.data.documentId,
      permission: result.data.permission,
      expiresAt: result.data.expiresAt,
    }, 'Share is valid'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShareLink,
  getShare,
  accessShareLink,
  revokeShareLink,
  getMyShares,
  getSharesCreatedByMe,
  validateShare,
};