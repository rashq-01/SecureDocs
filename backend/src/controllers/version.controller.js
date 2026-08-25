const { 
  getVersions: getVersionsService,
  getVersion: getVersionService, 
  downloadVersion: downloadVersionService,
  createVersion,
  getCurrentVersion,
} = require('../services/version.service');
const Document = require('../models/Document.model');
const { successResponse, errorResponse, ErrorCodes } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/audit.service');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Get all versions of a document
 * GET /api/v1/documents/:documentId/versions
 */
const getVersions = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    const versions = await getVersionsService(documentId);
    
    res.json(successResponse(versions, 'Versions retrieved'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific version
 * GET /api/v1/documents/:documentId/versions/:versionNumber
 */
const getVersion = async (req, res, next) => {
  try {
    const { documentId, versionNumber } = req.params;
    
    const version = await getVersionService(documentId, parseInt(versionNumber));
    
    res.json(successResponse(version, 'Version retrieved'));
  } catch (error) {
    if (error.message === 'VERSION_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Version not found',
        404
      ));
    }
    next(error);
  }
};

/**
 * Download a specific version
 * GET /api/v1/documents/:documentId/versions/:versionNumber/download
 */
const downloadVersion = async (req, res, next) => {
  try {
    const { documentId, versionNumber } = req.params;
    
    const version = await downloadVersionService(documentId, parseInt(versionNumber));
    
    // Verify hash
    const fileBuffer = fs.readFileSync(version.filePath);
    const { generateHash } = require('../services/hash.service');
    const actualHash = generateHash(fileBuffer);
    
    if (actualHash !== version.fileHash) {
      // Log tamper detection
      await writeAuditLog({
        actorId: req.user._id,
        action: 'TamperDetected',
        targetDocumentId: documentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Failure',
        metadata: {
          version: versionNumber,
          expectedHash: version.fileHash,
          actualHash,
          severity: 'CRITICAL'
        },
      });
      
      return res.status(409).json(errorResponse(
        ErrorCodes.TAMPER_DETECTED,
        'Version integrity check failed. File may have been tampered with.',
        409
      ));
    }
    
    // Log download
    await writeAuditLog({
      actorId: req.user._id,
      action: 'DocumentVersionDownloaded',
      targetDocumentId: documentId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: {
        version: versionNumber,
        fileName: version.originalFileName,
      },
    });
    
    // Decrypt file
    const { decryptFileToBuffer } = require('../services/encryption.service');
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptFileToBuffer(version.filePath);
    } catch (err) {
      logger.error('Failed to decrypt version document: ' + err.message);
      return res.status(500).json(errorResponse(ErrorCodes.SERVER_ERROR, 'Failed to decrypt document version', 500));
    }
    
    // Apply Watermark
    const { applyWatermark } = require('../services/watermark.service');
    decryptedBuffer = await applyWatermark(decryptedBuffer, version.originalFileName, req.user.email, req.ip, 'Downloaded');

    res.setHeader('Content-Disposition', `attachment; filename="${version.originalFileName}"`);
    res.setHeader('Content-Type', version.originalFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    res.send(Buffer.from(decryptedBuffer));
  } catch (error) {
    if (error.message === 'VERSION_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Version not found',
        404
      ));
    }
    if (error.message === 'FILE_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'File not found on server',
        404
      ));
    }
    next(error);
  }
};

/**
 * Create a new version
 * POST /api/v1/documents/:documentId/versions
 */
const createNewVersion = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { changelog } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json(errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'File is required',
        400
      ));
    }

    // Check if document exists and user has access
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Document not found',
        404
      ));
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.path);
    
    // Create version
    const result = await createVersion(
      documentId,
      fileBuffer,
      file.originalname,
      req.user._id,
      changelog || `Version ${document.currentVersion + 1}`
    );

    // Clean up temp file
    fs.unlinkSync(file.path);

    res.status(201).json(successResponse(
      result,
      `Version ${result.version.version} created successfully`
    ));
  } catch (error) {
    // Clean up temp file if exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Preview a specific version
 * GET /api/v1/documents/:documentId/versions/:versionNumber/preview
 */
const previewVersion = async (req, res, next) => {
  try {
    const { documentId, versionNumber } = req.params;
    
    const version = await downloadVersionService(documentId, parseInt(versionNumber));
    
    // Verify hash
    const fileBuffer = fs.readFileSync(version.filePath);
    const { generateHash } = require('../services/hash.service');
    const actualHash = generateHash(fileBuffer);
    
    if (actualHash !== version.fileHash) {
      // Log tamper detection
      await writeAuditLog({
        actorId: req.user._id,
        action: 'TamperDetected',
        targetDocumentId: documentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        result: 'Failure',
        metadata: {
          version: versionNumber,
          expectedHash: version.fileHash,
          actualHash,
          severity: 'CRITICAL'
        },
      });
      
      return res.status(409).json(errorResponse(
        ErrorCodes.TAMPER_DETECTED,
        'Version integrity check failed. File may have been tampered with.',
        409
      ));
    }
    
    // Log preview as DocumentViewed
    await writeAuditLog({
      actorId: req.user._id,
      action: 'DocumentViewed',
      targetDocumentId: documentId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'Success',
      metadata: {
        version: versionNumber,
        fileName: version.originalFileName,
      },
    });
    
    // Decrypt file
    const { decryptFileToBuffer } = require('../services/encryption.service');
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptFileToBuffer(version.filePath);
    } catch (err) {
      logger.error('Failed to decrypt version document: ' + err.message);
      return res.status(500).json(errorResponse(ErrorCodes.SERVER_ERROR, 'Failed to decrypt document version', 500));
    }
    
    // Apply Watermark
    const { applyWatermark } = require('../services/watermark.service');
    decryptedBuffer = await applyWatermark(decryptedBuffer, version.originalFileName, req.user.email, req.ip);

    // Set inline instead of attachment with correct mime type
    let mimeType = 'application/octet-stream';
    const ext = version.originalFileName.toLowerCase().split('.').pop();
    if (ext === 'pdf') mimeType = 'application/pdf';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'txt') mimeType = 'text/plain';

    res.setHeader('Content-Disposition', `inline; filename="${version.originalFileName}"`);
    res.setHeader('Content-Type', mimeType);
    res.send(Buffer.from(decryptedBuffer));
  } catch (error) {
    if (error.message === 'VERSION_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'Version not found',
        404
      ));
    }
    if (error.message === 'FILE_NOT_FOUND') {
      return res.status(404).json(errorResponse(
        ErrorCodes.DOCUMENT_NOT_FOUND,
        'File not found on server',
        404
      ));
    }
    next(error);
  }
};

module.exports = {
  getVersions,
  getVersion,
  downloadVersion,
  previewVersion,
  createNewVersion,
};