const Document = require('../models/Document.model');
const Case = require('../models/Case.model');
const { generateApprovalSignature } = require('./signature.service');
const logger = require('../utils/logger');

/**
 * Get allowed status transitions
 */
const getStatusTransitions = () => ({
  Draft: ['UnderReview', 'Archived'],
  UnderReview: ['Approved', 'Rejected'],
  Approved: ['Archived'],
  Rejected: ['Archived'],
  Archived: [],
});

/**
 * Check if a status transition is valid
 */
const isValidStatusTransition = (fromStatus, toStatus) => {
  const transitions = getStatusTransitions();
  return transitions[fromStatus] && transitions[fromStatus].includes(toStatus);
};

/**
 * Update document status with validation
 */
const updateDocumentStatus = async (documentId, newStatus, userId) => {
  const document = await Document.findById(documentId);
  if (!document) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }

  if (!isValidStatusTransition(document.status, newStatus)) {
    throw new Error('INVALID_STATUS_TRANSITION');
  }

  const oldStatus = document.status;
  document.status = newStatus;

  // Generate signature if approved
  if (newStatus === 'Approved') {
    const timestamp = new Date();
    document.approvedBy = userId;
    document.approvedAt = timestamp;
    document.approvalSignature = generateApprovalSignature(document.fileHash, userId, timestamp);
  }

  await document.save();

  logger.info(`Document ${documentId} status changed: ${oldStatus} -> ${newStatus} by ${userId}`);

  return {
    document,
    oldStatus,
    newStatus,
  };
};

/**
 * Get documents accessible to a user
 */
const getAccessibleDocuments = async (user, filters = {}) => {
  try {
    const query = {};

    // Always exclude deleted documents
    query.deletedAt = null;

    switch (user.role) {
      case 'Admin':
        // Admin sees all documents
        break;
      case 'IO': {
        // IO sees documents in their assigned cases
        const assignedCaseIds = user.assignedCases || [];
        if (assignedCaseIds.length === 0) {
          return [];
        }
        query.caseId = { $in: assignedCaseIds };
        break;
      }
      case 'Reviewer': {
        // Reviewer sees documents in their department
        if (!user.department) {
          return [];
        }
        const cases = await Case.find({ department: user.department });
        const caseIds = cases.map(c => c._id);
        if (caseIds.length === 0) {
          return [];
        }
        query.caseId = { $in: caseIds };
        break;
      }
      case 'LegalLiaison': {
        // Legal liaison sees approved documents only
        query.status = 'Approved';
        break;
      }
      case 'Auditor': {
        // Auditor sees all documents but only metadata
        break;
      }
      default:
        return [];
    }

    // Apply additional filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.caseId) {
      query.caseId = filters.caseId;
    }
    if (filters.documentType) {
      query.documentType = filters.documentType;
    }
    if (filters.search) {
      // filters.search could be a string or a RegExp object
      query.$or = [
        { title: { $regex: filters.search } },
        { originalFileName: { $regex: filters.search } },
        { documentType: { $regex: filters.search } }
      ];
    }

    const documents = await Document.find(query)
      .populate('caseId', 'caseId title department')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    return documents;
  } catch (error) {
    logger.error(`Error in getAccessibleDocuments: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getStatusTransitions,
  isValidStatusTransition,
  updateDocumentStatus,
  getAccessibleDocuments,
};