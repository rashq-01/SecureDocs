const Document = require('../models/Document.model');
const DocumentVersion = require('../models/DocumentVersion.model');
const AuditLog = require('../models/AuditLog.model');
const { writeAuditLog } = require('./audit.service');
const logger = require('../utils/logger');

/**
 * Soft delete a document (archive it)
 */
const archiveDocument = async (documentId, userId, reason = '') => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (document.isDeleted()) {
      throw new Error('DOCUMENT_ALREADY_DELETED');
    }

    await document.archive(userId, reason);

    // Write audit log
    await writeAuditLog({
      actorId: userId,
      action: 'DocumentArchived',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      result: 'Success',
      metadata: {
        title: document.title,
        reason,
        archivedAt: document.archivedAt,
      },
    });

    return document;
  } catch (error) {
    logger.error(`Document archive failed: ${error.message}`);
    throw error;
  }
};

/**
 * Soft delete a document (mark as deleted)
 */
const deleteDocument = async (documentId, userId, reason = '') => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (document.isDeleted()) {
      throw new Error('DOCUMENT_ALREADY_DELETED');
    }

    await document.softDelete(userId, reason);

    // Write audit log
    await writeAuditLog({
      actorId: userId,
      action: 'DocumentDeleted',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      result: 'Success',
      metadata: {
        title: document.title,
        reason,
        deletedAt: document.deletedAt,
      },
    });

    return document;
  } catch (error) {
    logger.error(`Document deletion failed: ${error.message}`);
    throw error;
  }
};

/**
 * Restore a deleted/archived document
 */
const restoreDocument = async (documentId, userId, reason = '') => {
  try {
    const document = await Document.findById(documentId).includeDeleted();
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (!document.isDeleted() && !document.isArchived()) {
      throw new Error('DOCUMENT_NOT_DELETED');
    }

    await document.restore(userId, reason);

    // Write audit log
    await writeAuditLog({
      actorId: userId,
      action: 'DocumentRestored',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      result: 'Success',
      metadata: {
        title: document.title,
        reason,
        restoredAt: new Date(),
      },
    });

    return document;
  } catch (error) {
    logger.error(`Document restoration failed: ${error.message}`);
    throw error;
  }
};

/**
 * Permanently delete a document (hard delete)
 * Only for Admins, and only as a last resort
 */
const permanentDeleteDocument = async (documentId, userId) => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // Get all versions
    const versions = await DocumentVersion.find({ documentId });

    // Log before deletion
    await writeAuditLog({
      actorId: userId,
      action: 'DocumentPermanentDeleted',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      result: 'Success',
      metadata: {
        title: document.title,
        versionsCount: versions.length,
        fileHash: document.fileHash,
      },
    });

    // Delete all versions
    await DocumentVersion.deleteMany({ documentId });

    // Delete audit logs associated with this document
    await AuditLog.deleteMany({ targetDocumentId: documentId });

    // Delete the document
    await document.deleteOne();

    return { success: true, message: 'Document permanently deleted' };
  } catch (error) {
    logger.error(`Permanent deletion failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get all deleted documents (for recovery)
 */
const getDeletedDocuments = async (userId, options = {}) => {
  const { limit = 50, skip = 0 } = options;

  const query = Document.find()
    .includeDeleted()
    .where({ deletedAt: { $ne: null } })
    .populate('deletedBy', 'name email')
    .populate('uploadedBy', 'name email')
    .populate('caseId', 'caseId title')
    .sort({ deletedAt: -1 })
    .limit(limit)
    .skip(skip);

  const [documents, total] = await Promise.all([
    query,
    Document.countDocuments({ deletedAt: { $ne: null } }),
  ]);

  return { documents, total, limit, skip };
};

/**
 * Get all archived documents
 */
const getArchivedDocuments = async (userId, options = {}) => {
  const { limit = 50, skip = 0 } = options;

  const query = Document.find()
    .where({ status: 'Archived', deletedAt: null })
    .populate('archivedBy', 'name email')
    .populate('uploadedBy', 'name email')
    .populate('caseId', 'caseId title')
    .sort({ archivedAt: -1 })
    .limit(limit)
    .skip(skip);

  const [documents, total] = await Promise.all([
    query,
    Document.countDocuments({ status: 'Archived', deletedAt: null }),
  ]);

  return { documents, total, limit, skip };
};

module.exports = {
  archiveDocument,
  deleteDocument,
  restoreDocument,
  permanentDeleteDocument,
  getDeletedDocuments,
  getArchivedDocuments,
};