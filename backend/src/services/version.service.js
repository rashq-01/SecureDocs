const fs = require('fs');
const path = require('path');
const Document = require('../models/Document.model');
const DocumentVersion = require('../models/DocumentVersion.model');
const { generateHash } = require('./hash.service');
const { writeAuditLog } = require('./audit.service');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Create a new version of a document
 */
const createVersion = async (documentId, fileBuffer, originalFileName, userId, changelog = '') => {
  try {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // Generate hash for new version
    const fileHash = generateHash(fileBuffer);
    
    // Generate hash-based filename
    const hashFilename = `${fileHash}.${originalFileName.split('.').pop() || 'bin'}`;
    const filePath = path.join(config.uploadDir, hashFilename);
    
    // Save file
    fs.writeFileSync(filePath, fileBuffer);

    // Get next version number
    const nextVersion = (document.currentVersion || 0) + 1;

    // Create version record
    const version = new DocumentVersion({
      documentId: document._id,
      version: nextVersion,
      fileHash,
      filePath,
      originalFileName,
      fileSize: fileBuffer.length,
      uploadedBy: userId,
      changelog,
    });

    await version.save();

    // Update document
    document.currentVersion = nextVersion;
    document.fileHash = fileHash;
    document.filePath = filePath;
    document.originalFileName = originalFileName;
    document.fileSize = fileBuffer.length;
    document.versionHistory.push({
      version: nextVersion,
      fileHash,
      uploadedBy: userId,
      changelog,
      createdAt: new Date(),
    });
    await document.save();

    // Write audit log
    await writeAuditLog({
      actorId: userId,
      action: 'DocumentVersionCreated',
      targetDocumentId: document._id,
      targetCaseId: document.caseId,
      result: 'Success',
      metadata: {
        version: nextVersion,
        changelog,
        fileSize: fileBuffer.length,
      },
    });

    return { document, version };
  } catch (error) {
    logger.error(`Version creation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get all versions of a document
 */
const getVersions = async (documentId) => {
  const versions = await DocumentVersion.find({ documentId })
    .populate('uploadedBy', 'name email')
    .sort({ version: -1 });
  
  return versions;
};

/**
 * Get a specific version
 */
const getVersion = async (documentId, versionNumber) => {
  const version = await DocumentVersion.findOne({ 
    documentId, 
    version: versionNumber 
  }).populate('uploadedBy', 'name email');
  
  if (!version) {
    throw new Error('VERSION_NOT_FOUND');
  }
  
  return version;
};

/**
 * Download a specific version
 */
const downloadVersion = async (documentId, versionNumber) => {
  const version = await getVersion(documentId, versionNumber);
  
  if (!fs.existsSync(version.filePath)) {
    throw new Error('FILE_NOT_FOUND');
  }
  
  return version;
};

/**
 * Get the current version
 */
const getCurrentVersion = async (documentId) => {
  const document = await Document.findById(documentId);
  if (!document) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }
  
  return getVersion(documentId, document.currentVersion);
};

module.exports = {
  createVersion,
  getVersions,
  getVersion,
  downloadVersion,
  getCurrentVersion,
};