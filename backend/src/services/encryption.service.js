const crypto = require('crypto');
const fs = require('fs');

// We need a 32-byte key for AES-256
// In a real production system, this should come from AWS KMS, HashiCorp Vault, or an env variable.
// For demonstration, we'll use a fixed key from env or a fallback.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// Convert hex to buffer if it's hex, else just use the buffer (assuming env provides 64 hex chars)
const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a buffer and return the encrypted buffer along with the IV and auth tag prepended
 */
const encryptBuffer = (buffer) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes for GCM

  // Result: [IV (16)] + [AuthTag (16)] + [Encrypted Data]
  return Buffer.concat([iv, authTag, encrypted]);
};

/**
 * Decrypt a buffer that has the IV and auth tag prepended
 */
const decryptBuffer = (buffer) => {
  if (buffer.length < 32) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = buffer.slice(0, 16);
  const authTag = buffer.slice(16, 32);
  const encryptedData = buffer.slice(32);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
};

/**
 * Encrypt a file at the given path (in-place replacement for simplicity, 
 * but usually you'd stream it for very large files)
 */
const encryptFile = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const encrypted = encryptBuffer(fileBuffer);
  fs.writeFileSync(filePath, encrypted);
};

/**
 * Decrypt a file and return the decrypted buffer
 */
const decryptFileToBuffer = (filePath) => {
  const encryptedBuffer = fs.readFileSync(filePath);
  return decryptBuffer(encryptedBuffer);
};

module.exports = {
  encryptBuffer,
  decryptBuffer,
  encryptFile,
  decryptFileToBuffer,
};
