const fs = require('fs');
const path = require('path');
const Document = require('../models/Document.model');
const Case = require('../models/Case.model');
const User = require('../models/User.model');
const { generateHash, verifyFileHash, generateHashFilename } = require('../services/hash.service');
const { verifyApprovalSignature } = require('../services/signature.service');
const { writeAuditLog } = require('../services/audit.service');
const { updateDocumentStatus, getAccessibleDocuments } = require('../services/document.service');
const { createNotification } = require('../services/notification.service');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const config = require('../config/env');
const logger = require('../utils/logger');
const { runDetectionChecks } = require('../services/suspiciousDetection.service');

/**
 * Upload a new document
 * POST /api/v1/documents
 */
const uploadDocument = async (req, res, next) => {
  try {
    const { title, caseId, documentType, classificationLevel = 'General', metadata = {} } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File is required',
        400
      ));
    }

    // Verify case exists and user has access
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json(errorResponse(
        ErrorCodes.CASE_NOT_FOUND,
        'Case not found',
        404
      ));
    }

    // Check if user is assigned to this case (for IO role)
    if (req.user.role === 'IO') {
      const isAssigned = caseData.assignedOfficers.some(
        id => id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json(errorResponse(
          ErrorCodes.RBAC_DENIED,
          'You are not assigned to this case',
          403
        ));
      }
    }

    // Read file and generate hash
    let fileBuffer = fs.readFileSync(file.path);

    // ---------------------------------------------------------
    // Malware & Virus Scanning (Simulated ClamAV Integration)
    // ---------------------------------------------------------
    const scanForMalware = (buffer) => {
      // In production, this would pipe the buffer to ClamAV/clamscan
      // For demonstration, we check for a specific EICAR test string signature
      const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      if (buffer.toString().includes(eicarSignature)) {
        return { isInfected: true, virusName: 'EICAR-Test-Signature' };
      }
      return { isInfected: false };
    };

    const scanResult = scanForMalware(fileBuffer);
    if (scanResult.isInfected) {
      // Clean up temp file
      fs.unlinkSync(file.path);
      
      // Log severe security alert
      await writeAuditLog({
        actorId: req.user._id,
        action: 'MalwareDetected',
        targetCaseId: caseId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Failure',
        metadata: { fileName: file.originalname, threat: scanResult.virusName },
      });

      return res.status(403).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `SECURITY ALERT: Malware detected (${scanResult.virusName}). Upload rejected.`,
        403
      ));
    }

    // Encrypt at rest
    const { encryptBuffer } = require('../services/encryption.service');
    fileBuffer = encryptBuffer(fileBuffer);

    // Generate hash of the encrypted buffer for tamper detection
    const fileHash = generateHash(fileBuffer);

    // Generate hash-based filename for storage
    const hashFilename = generateHashFilename(fileBuffer, file.originalname);
    const newFilePath = path.join(config.uploadDir, hashFilename);

    // Save ENCRYPTED buffer to the new file path
    fs.writeFileSync(newFilePath, fileBuffer);

    // Clean up temp file
    fs.unlinkSync(file.path);

    // Create document record
    const document = new Document({
      title,
      caseId,
      documentType,
      classificationLevel,
      fileHash,
      filePath: newFilePath,
      originalFileName: file.originalname,
      fileSize: file.size,
      uploadedBy: req.user._id,
      status: 'Draft',
      metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
    });

    await document.save();

    // Create initial DocumentVersion (V1)
    const DocumentVersion = require('../models/DocumentVersion.model');
    const initialVersion = new DocumentVersion({
      documentId: document._id,
      version: 1,
      fileHash,
      filePath: newFilePath,
      originalFileName: file.originalname,
      fileSize: file.size,
      uploadedBy: req.user._id,
      changelog: 'Initial upload',
    });
    await initialVersion.save();

    // Populate for response - use execPopulate or find the document again
    const populatedDoc = await Document.findById(document._id)
      .populate('caseId', 'caseId title')
      .populate('uploadedBy', 'name email');

    // Write audit log
    await writeAuditLog({
      actorId: req.user._id,
      action: 'DocumentUploaded',
      targetDocumentId: document._id,
      targetCaseId: caseId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { title, documentType, fileSize: file.size },
    });

    // Notify Reviewers of the department
    const caseObj = await Case.findById(caseId);
    if (caseObj) {
      const reviewers = await User.find({ role: 'Reviewer', department: caseObj.department });
      for (const reviewer of reviewers) {
        await createNotification({
          userId: reviewer._id,
          type: 'NewDocumentInCase',
          message: `New document "${title}" uploaded to case ${caseObj.caseId}`,
          relatedDocumentId: document._id,
          relatedCaseId: caseObj._id,
        });
      }
    }

    res.status(201).json(successResponse(populatedDoc, 'Document uploaded successfully'));
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Get documents with filters
 * GET /api/v1/documents
 */
const getDocuments = async (req, res, next) => {
  try {
    const { status, caseId, documentType, search } = req.query;
    
    const filters = { status, caseId, documentType, search };
    
    // Log the request for debugging
    logger.debug(`User ${req.user.email} (${req.user.role}) fetching documents with filters:`, filters);
    
    const documents = await getAccessibleDocuments(req.user, filters);
    
    // For Auditor, remove sensitive fields
    if (req.user.role === 'Auditor') {
      const sanitizedDocs = documents.map(doc => {
        const docObj = doc.toObject();
        delete docObj.fileHash;
        delete docObj.filePath;
        return docObj;
      });
      return res.json(successResponse(sanitizedDocs, 'Documents retrieved (auditor view)'));
    }

    res.json(successResponse(documents, 'Documents retrieved'));
  } catch (error) {
    logger.error(`Error in getDocuments: ${error.message}`);
    logger.error(error.stack);
    next(error);
  }
};

/**
 * Get single document metadata
 * GET /api/v1/documents/:id
 */
const getDocument = async (req, res, next) => {
  try {
    let document = req.document;
    
    if (document) {
      await document.populate([
        { path: 'caseId', select: 'caseId title department' },
        { path: 'uploadedBy', select: 'name email' }
      ]);
    } else {
      document = await Document.findById(req.params.id)
        .populate('caseId', 'caseId title department')
        .populate('uploadedBy', 'name email');
    }

    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    // Log the view
    await writeAuditLog({
      actorId: req.user._id,
      action: 'DocumentViewed',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { title: document.title },
    });

    // Run detection checks for document view
    await runDetectionChecks(
      req.user._id,
      req.ip,
      'DocumentViewed',
      { documentId: document._id }
    );

    // For Auditor, return metadata only (no content)
    if (req.user.role === 'Auditor') {
      const auditorView = document.toObject();
      delete auditorView.fileHash;
      delete auditorView.filePath;
      return res.json(successResponse(auditorView, 'Document metadata retrieved'));
    }

    res.json(successResponse(document, 'Document retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Download document
 * GET /api/v1/documents/:id/download
 */
const downloadDocument = async (req, res, next) => {
  try {
    const document = req.document || await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      logger.error(`File not found: ${document.filePath}`);
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'File not found on server',
        404
      ));
    }

    // Verify hash
    const { isValid, actualHash } = await verifyFileHash(document.filePath, document.fileHash);
    
    if (!isValid) {
      // Update tamper flag
      document.tamperFlag = true;
      await document.save();

      // Log tamper detection
      await writeAuditLog({
        actorId: req.user._id,
        action: 'TamperDetected',
        targetDocumentId: document._id,
        targetCaseId: document.caseId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Failure',
        metadata: { 
          expectedHash: document.fileHash,
          actualHash,
          fileName: document.originalFileName,
          severity: 'CRITICAL'
        },
      });

      return res.status(409).json(errorResponse(
        ErrorCodes.TAMPER_DETECTED,
        'Document integrity check failed. File may have been tampered with.',
        409
      ));
    }

    // Log download
    await writeAuditLog({
      actorId: req.user._id,
      action: 'DocumentDownloaded',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { fileName: document.originalFileName },
    });

    // Run detection checks for download
    await runDetectionChecks(
      req.user._id,
      req.ip,
      'DocumentDownloaded',
      { documentId: document._id }
    );

    // Decrypt file
    const { decryptFileToBuffer } = require('../services/encryption.service');
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptFileToBuffer(document.filePath);
    } catch (err) {
      logger.error('Failed to decrypt document: ' + err.message);
      return res.status(500).json(errorResponse(ErrorCodes.SERVER_ERROR, 'Failed to decrypt document', 500));
    }

    // Apply Watermark
    const { applyWatermark } = require('../services/watermark.service');
    decryptedBuffer = await applyWatermark(decryptedBuffer, document.originalFileName, req.user.email, req.ip, 'Downloaded');

    // Send file buffer directly
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalFileName}"`);
    res.setHeader('Content-Type', document.originalFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    res.send(Buffer.from(decryptedBuffer));
  } catch (error) {
    next(error);
  }
};

/**
 * Preview document inline
 * GET /api/v1/documents/:id/preview
 */
const previewDocument = async (req, res, next) => {
  try {
    const document = req.document || await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    if (!fs.existsSync(document.filePath)) {
      logger.error(`File not found: ${document.filePath}`);
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'File not found on server',
        404
      ));
    }

    // Verify hash
    const { isValid, actualHash } = await verifyFileHash(document.filePath, document.fileHash);
    
    if (!isValid) {
      document.tamperFlag = true;
      await document.save();

      await writeAuditLog({
        actorId: req.user._id,
        action: 'TamperDetected',
        targetDocumentId: document._id,
        targetCaseId: document.caseId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Warning',
        metadata: { expectedHash: document.fileHash, actualHash, severity: 'CRITICAL' },
      });

      return res.status(403).json(errorResponse(
        ErrorCodes.DATA_INTEGRITY_ERROR,
        'Document integrity compromised (hash mismatch)',
        403
      ));
    }

    await writeAuditLog({
      actorId: req.user._id,
      action: 'DocumentViewed',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { originalFileName: document.originalFileName },
    });

    const { decryptFileToBuffer } = require('../services/encryption.service');
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptFileToBuffer(document.filePath);
    } catch (err) {
      logger.error('Failed to decrypt document: ' + err.message);
      return res.status(500).json(errorResponse(ErrorCodes.SERVER_ERROR, 'Failed to decrypt document', 500));
    }

    const { applyWatermark } = require('../services/watermark.service');
    decryptedBuffer = await applyWatermark(decryptedBuffer, document.originalFileName, req.user.email, req.ip);

    // Set inline instead of attachment
    let mimeType = 'application/octet-stream';
    const ext = document.originalFileName.toLowerCase().split('.').pop();
    if (ext === 'pdf') mimeType = 'application/pdf';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'txt') mimeType = 'text/plain';

    res.setHeader('Content-Disposition', `inline; filename="${document.originalFileName}"`);
    res.setHeader('Content-Type', mimeType);
    res.send(Buffer.from(decryptedBuffer));
  } catch (error) {
    next(error);
  }
};

/**
 * Update document status
 * PATCH /api/v1/documents/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const documentId = req.params.id;

    if (!status) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Status is required',
        400
      ));
    }

    const result = await updateDocumentStatus(documentId, status, req.user._id);

    // Write audit log
    await writeAuditLog({
      actorId: req.user._id,
      action: 'DocumentStatusChanged',
      targetDocumentId: documentId,
      targetCaseId: result.document.caseId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: { 
        fromStatus: result.oldStatus,
        toStatus: result.newStatus,
      },
    });

    // Get populated document
    const populatedDoc = await Document.findById(documentId)
      .populate('caseId', 'caseId title')
      .populate('uploadedBy', 'name email');

    // Notify original uploader
    if (populatedDoc.uploadedBy && populatedDoc.uploadedBy._id.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: populatedDoc.uploadedBy._id,
        type: 'DocumentStatusChanged',
        message: `Document "${populatedDoc.title}" status changed to ${status}`,
        relatedDocumentId: populatedDoc._id,
        relatedCaseId: populatedDoc.caseId ? populatedDoc.caseId._id : null,
      });
    }

    res.json(successResponse(populatedDoc, `Status updated to ${status}`));
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }
    if (error.message === 'INVALID_STATUS_TRANSITION') {
      return res.status(400).json(errorResponse(
        ErrorCodes.INVALID_STATUS_TRANSITION,
        'Invalid status transition',
        400
      ));
    }
    next(error);
  }
};

/**
 * Verify document signature
 * GET /api/v1/documents/:id/verify-signature
 */
const verifySignature = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('approvedBy', 'name email');

    if (!document) {
      return res.status(404).json(errorResponse(ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found', 404));
    }

    if (document.status !== 'Approved' || !document.approvalSignature) {
      return res.status(400).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Document does not have a signature', 400));
    }

    const isValid = verifyApprovalSignature(
      document.fileHash,
      document.approvedBy._id,
      document.approvedAt,
      document.approvalSignature
    );

    res.json(successResponse({
      isValid,
      approvedBy: document.approvedBy,
      approvedAt: document.approvedAt,
    }, isValid ? 'Signature verified successfully' : 'Signature verification failed'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  downloadDocument,
  previewDocument,
  updateStatus,
  verifySignature,
};