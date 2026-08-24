const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  version: {
    type: Number,
    required: true,
  },
  fileHash: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changelog: {
    type: String,
    trim: true,
  },
  metadata: {
    type: Map,
    of: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Ensure unique version per document
documentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);