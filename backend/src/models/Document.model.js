const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  documentType: {
    type: String,
    enum: ['FIR', 'Forensic Report', 'Court Order', 'Evidence Log', 'Witness Statement', 'Other'],
    required: true,
  },
  classificationLevel: {
    type: String,
    enum: ['General', 'Confidential', 'Restricted'],
    default: 'General',
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
    index: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'UnderReview', 'Approved', 'Rejected', 'Archived'],
    default: 'Draft',
    index: true,
  },
  tamperFlag: {
    type: Boolean,
    default: false,
  },
  approvalSignature: {
    type: String,
  },
  aiSummary: {
    type: String,
    default: null,
  },
  aiSuggestedType: {
    type: String,
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  currentVersion: {
    type: Number,
    default: 1,
  },
  versionHistory: [{
    version: Number,
    fileHash: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changelog: String,
    createdAt: Date,
  }],
  metadata: {
    type: Map,
    of: String,
    default: {},
  },
  permissions: {
    type: Map,
    of: [{
      type: String,
      enum: ['VIEW', 'DOWNLOAD', 'SHARE', 'EDIT', 'DELETE'],
    }],
    default: {},
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  restorationReason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  strictPopulate: false,
});

// Index for queries that should exclude soft-deleted documents
documentSchema.index({ deletedAt: 1, status: 1 });

// Virtual for case ID as string
documentSchema.virtual('caseIdString').get(function() {
  return this.caseId ? this.caseId.toString() : null;
});

// Middleware to exclude soft-deleted documents by default
// Only apply to find and findOne, not to countDocuments
documentSchema.pre('find', function() {
  if (!this._skipDeletedFilter) {
    this.where({ deletedAt: null });
  }
});

documentSchema.pre('findOne', function() {
  if (!this._skipDeletedFilter) {
    this.where({ deletedAt: null });
  }
});

// Do NOT apply to countDocuments - this was causing the error

// Allow including deleted documents when needed
documentSchema.methods.includeDeleted = function() {
  this._skipDeletedFilter = true;
  return this;
};

// Soft delete method
documentSchema.methods.softDelete = async function(userId, reason = '') {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.status = 'Archived';
  this.metadata = this.metadata || new Map();
  this.metadata.set('deletionReason', reason);
  await this.save();
  return this;
};

// Archive method
documentSchema.methods.archive = async function(userId, reason = '') {
  this.archivedAt = new Date();
  this.archivedBy = userId;
  this.status = 'Archived';
  this.metadata = this.metadata || new Map();
  this.metadata.set('archiveReason', reason);
  await this.save();
  return this;
};

// Restore from archive/delete
documentSchema.methods.restore = async function(userId, reason = '') {
  this.deletedAt = null;
  this.deletedBy = null;
  this.archivedAt = null;
  this.archivedBy = null;
  this.status = 'Draft';
  this.metadata = this.metadata || new Map();
  this.metadata.set('restorationReason', reason);
  this.metadata.set('restoredBy', userId);
  await this.save();
  return this;
};

// Check if document is deleted
documentSchema.methods.isDeleted = function() {
  return this.deletedAt !== null;
};

// Check if document is archived
documentSchema.methods.isArchived = function() {
  return this.archivedAt !== null || this.status === 'Archived';
};

// Method to check if document is accessible to a user
documentSchema.methods.isAccessibleTo = async function(user) {
  if (user.role === 'Admin') return true;
  if (user.role === 'IO') {
    const caseData = await mongoose.model('Case').findById(this.caseId);
    if (!caseData) return false;
    return caseData.assignedOfficers.some(id => id.toString() === user._id.toString());
  }
  if (user.role === 'Reviewer') {
    const caseData = await mongoose.model('Case').findById(this.caseId);
    if (!caseData) return false;
    return caseData.department === user.department;
  }
  if (user.role === 'Auditor') {
    return true;
  }
  if (user.role === 'LegalLiaison') {
    return this.status === 'Approved';
  }
  return false;
};

module.exports = mongoose.model('Document', documentSchema);