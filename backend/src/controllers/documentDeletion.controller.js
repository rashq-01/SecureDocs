const {
  archiveDocument,
  deleteDocument,
  restoreDocument,
  permanentDeleteDocument,
  getDeletedDocuments,
  getArchivedDocuments,
} = require('../services/documentDeletion.service');
const Document = require('../models/Document.model');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Archive a document (soft delete with status Archived)
 * POST /api/v1/documents/:id/archive
 */
const archive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const document = await archiveDocument(id, req.user._id, reason);

    res.json(successResponse(document, 'Document archived successfully'));
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }
    if (error.message === 'DOCUMENT_ALREADY_DELETED') {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Document is already deleted',
        400
      ));
    }
    next(error);
  }
};

/**
 * Soft delete a document
 * POST /api/v1/documents/:id/delete
 */
const softDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const document = await deleteDocument(id, req.user._id, reason);

    res.json(successResponse(document, 'Document deleted successfully'));
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }
    if (error.message === 'DOCUMENT_ALREADY_DELETED') {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Document is already deleted',
        400
      ));
    }
    next(error);
  }
};

/**
 * Restore a deleted/archived document
 * POST /api/v1/documents/:id/restore
 */
const restore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const document = await restoreDocument(id, req.user._id, reason);

    res.json(successResponse(document, 'Document restored successfully'));
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }
    if (error.message === 'DOCUMENT_NOT_DELETED') {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Document is not deleted or archived',
        400
      ));
    }
    next(error);
  }
};

/**
 * Permanently delete a document (Admin only)
 * DELETE /api/v1/documents/:id/permanent
 */
const permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await permanentDeleteDocument(id, req.user._id);

    res.json(successResponse(null, result.message));
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
 * Get deleted documents (Admin only)
 * GET /api/v1/documents/deleted
 */
const getDeleted = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const result = await getDeletedDocuments(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json(successResponse(result, 'Deleted documents retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get archived documents (Admin only)
 * GET /api/v1/documents/archived
 */
const getArchived = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const result = await getArchivedDocuments(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json(successResponse(result, 'Archived documents retrieved'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  archive,
  softDelete,
  restore,
  permanentDelete,
  getDeleted,
  getArchived,
};
