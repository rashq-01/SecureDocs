const AccessRequest = require('../models/AccessRequest.model');
const {
  createAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  getPendingRequests,
  getUserRequests,
  validateAccessToken,
  revokeAccessToken,
} = require('../services/accessRequest.service');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Create an access request
 * POST /api/v1/access-requests
 */
const createRequest = async (req, res, next) => {
  try {
    const { documentId, permissionRequested, justification } = req.body;

    const request = await createAccessRequest(
      documentId,
      req.user._id,
      permissionRequested,
      justification
    );

    res.status(201).json(successResponse(request, 'Access request created'));
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
    if (error.message === 'REQUEST_ALREADY_PENDING') {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'You already have a pending request for this document',
        400
      ));
    }
    next(error);
  }
};

/**
 * Approve an access request
 * PATCH /api/v1/access-requests/:id/approve
 */
const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { expiresInDays = 7 } = req.body;

    const request = await approveAccessRequest(id, req.user._id, expiresInDays);

    res.json(successResponse(request, 'Access request approved'));
  } catch (error) {
    if (error.message === 'REQUEST_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Request not found',
        404
      ));
    }
    if (error.message === 'REQUEST_ALREADY_PROCESSED') {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Request has already been processed',
        400
      ));
    }
    next(error);
  }
};

/**
 * Reject an access request
 * PATCH /api/v1/access-requests/:id/reject
 */
const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await rejectAccessRequest(id, req.user._id, reason);

    res.json(successResponse(request, 'Access request rejected'));
  } catch (error) {
    if (error.message === 'REQUEST_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Request not found',
        404
      ));
    }
    if (error.message === 'REQUEST_ALREADY_PROCESSED') {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Request has already been processed',
        400
      ));
    }
    next(error);
  }
};

/**
 * Get pending requests for a document
 * GET /api/v1/access-requests/document/:documentId/pending
 */
const getPending = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const requests = await getPendingRequests(documentId);

    res.json(successResponse(requests, 'Pending requests retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's requests
 * GET /api/v1/access-requests/me
 */
const getMyRequests = async (req, res, next) => {
  try {
    const { status } = req.query;

    const requests = await getUserRequests(req.user._id, status);

    res.json(successResponse(requests, 'Your requests retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Validate access token
 * GET /api/v1/access-requests/validate/:token
 */
const validateToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { documentId } = req.query;

    if (!documentId) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'documentId is required',
        400
      ));
    }

    const result = await validateAccessToken(token, documentId);

    if (!result.valid) {
      return res.status(401).json(errorResponse(
        ErrorCodes.AUTH_TOKEN_INVALID,
        result.error || 'Invalid access token',
        401
      ));
    }

    res.json(successResponse(result, 'Token is valid'));
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke access token
 * POST /api/v1/access-requests/revoke
 */
const revokeToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Token is required',
        400
      ));
    }

    await revokeAccessToken(token, req.user._id);

    res.json(successResponse(null, 'Access token revoked'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  approveRequest,
  rejectRequest,
  getPending,
  getMyRequests,
  validateToken,
  revokeToken,
};