const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  permission: {
    type: String,
    enum: ['VIEW', 'DOWNLOAD', 'SHARE', 'EDIT'],
    required: true,
  },
  shareToken: {
    type: String,
    unique: true,
    required: true,
  },
  message: {
    type: String,
    trim: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  accessCount: {
    type: Number,
    default: 0,
  },
  maxAccessCount: {
    type: Number,
    default: null, // null = unlimited
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Revoked'],
    default: 'Active',
    index: true,
  },
  revokedAt: {
    type: Date,
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastAccessedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient queries
shareSchema.index({ documentId: 1, status: 1 });
shareSchema.index({ sharedWith: 1, status: 1 });
shareSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Share', shareSchema);