const crypto = require('crypto');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Generate SHA-256 hash from a buffer
 */
const generateHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate SHA-256 hash from a file path
 */
const generateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => {
      hash.update(data);
    });
    
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    
    stream.on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * Verify a file's hash matches the expected hash
 */
const verifyFileHash = async (filePath, expectedHash) => {
  try {
    const actualHash = await generateFileHash(filePath);
    const isValid = actualHash === expectedHash;
    
    if (!isValid) {
      logger.warn(`Hash mismatch for file: ${filePath}`);
      logger.warn(`Expected: ${expectedHash}`);
      logger.warn(`Actual: ${actualHash}`);
    }
    
    return { isValid, actualHash };
  } catch (error) {
    logger.error(`Hash verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Generate a hash-based filename
 */
const generateHashFilename = (buffer, originalName) => {
  const hash = generateHash(buffer);
  const extension = originalName.split('.').pop() || 'bin';
  return `${hash}.${extension}`;
};

module.exports = {
  generateHash,
  generateFileHash,
  verifyFileHash,
  generateHashFilename,
};