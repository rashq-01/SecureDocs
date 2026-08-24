const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  approverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  permissionRequested: {
    type: String,
    enum: ['VIEW', 'DOWNLOAD', 'SHARE', 'EDIT'],
    required: true,
  },
  justification: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Expired'],
    default: 'Pending',
    index: true,
  },
  approvedAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date,
  },
  rejectedReason: {
    type: String,
    trim: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
  },
  accessToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient queries
accessRequestSchema.index({ requesterId: 1, status: 1 });
accessRequestSchema.index({ documentId: 1, status: 1 });
accessRequestSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);