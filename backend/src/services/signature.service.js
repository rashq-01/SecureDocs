const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Generate HMAC-SHA256 signature for a document approval
 */
const generateApprovalSignature = (documentHash, reviewerId, timestamp) => {
  if (!config.signatureSecret) {
    logger.error('SIGNATURE_SECRET is missing in environment variables');
    throw new Error('Server configuration error: Missing signature secret');
  }

  const dataToSign = `${documentHash}:${reviewerId.toString()}:${timestamp.toISOString()}`;
  
  return crypto
    .createHmac('sha256', config.signatureSecret)
    .update(dataToSign)
    .digest('hex');
};

/**
 * Verify HMAC-SHA256 signature for a document approval
 */
const verifyApprovalSignature = (documentHash, reviewerId, timestamp, signature) => {
  if (!signature || !documentHash || !reviewerId || !timestamp) {
    return false;
  }

  try {
    const expectedSignature = generateApprovalSignature(documentHash, reviewerId, timestamp);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error(`Signature verification failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  generateApprovalSignature,
  verifyApprovalSignature,
};
