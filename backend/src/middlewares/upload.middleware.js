const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/env');
const { errorResponse, ErrorCodes } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Ensure upload directory exists
const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with hash
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${random}${extension}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
  },
});

// Middleware wrapper with error handling
const uploadMiddleware = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json(errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Invalid file type. Allowed: PDF, DOCX, JPEG, PNG',
            400
          ));
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json(errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `File size exceeds ${config.maxFileSizeMB}MB limit`,
            400
          ));
        }
        logger.error(`Upload error: ${err.message}`);
        return res.status(500).json(errorResponse(
          ErrorCodes.SERVER_ERROR,
          'File upload failed',
          500
        ));
      }
      next();
    });
  };
};

module.exports = uploadMiddleware;