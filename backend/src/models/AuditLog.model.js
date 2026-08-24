const mongoose = require('mongoose');
const crypto = require('crypto');

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: [
      // Authentication
      'Login', 'LoginFailed', 'Logout', 'TokenRefreshed',
      
      // Document operations
      'DocumentUploaded', 'DocumentViewed', 'DocumentDownloaded', 
      'DocumentStatusChanged', 'DocumentDeleted', 'DocumentArchived', 
      'DocumentRestored', 'DocumentPermanentDeleted', 'DocumentVersionCreated',
      'DocumentVersionDownloaded', 'DocumentShared', 'ShareRevoked',
      'SharedDocumentAccessed',
      
      // Access Control
      'AccessRequested', 'AccessApproved', 'AccessRejected', 'AccessRevoked',
      'PermissionGranted', 'PermissionRevoked',
      
      // Case operations
      'CaseCreated', 'CaseUpdated', 'CaseStatusChanged', 
      'CaseMemberAdded', 'CaseMemberRemoved', 'CasePriorityChanged',
      'CaseTagAdded', 'CaseTagRemoved',
      
      // User management
      'UserCreated', 'UserUpdated', 'UserDeactivated', 'UserActivated',
      'UserRoleChanged', 'UserPasswordChanged',
      
      // System events
      'SystemAlert', 'TamperDetected', 'SuspiciousActivity',
      'RateLimitExceeded', 'UnauthorizedAccessAttempt',
      
      // Other
      'SecurityEvent',
    ],
    required: true,
    index: true,
  },
  targetDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    index: true,
  },
  targetCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    index: true,
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  result: {
    type: String,
    enum: ['Success', 'Failure'],
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Hash chain for tamper-proof audit
  previousHash: {
    type: String,
  },
  hash: {
    type: String,
    unique: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  strict: true,
  timestamps: false,
});

// Pre-save hook to generate hash chain
auditLogSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate hash for this entry
    const content = JSON.stringify({
      actorId: this.actorId?.toString() || '',
      action: this.action,
      targetDocumentId: this.targetDocumentId?.toString() || '',
      targetCaseId: this.targetCaseId?.toString() || '',
      targetUserId: this.targetUserId?.toString() || '',
      result: this.result,
      timestamp: this.timestamp?.toISOString() || '',
      metadata: this.metadata,
    });
    
    // Include previous hash if exists
    const previousHash = this.previousHash || '';
    const dataToHash = previousHash + content;
    this.hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  }
  next();
});

// Ensure no update/delete operations are possible
auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs are append-only. Updates are not allowed.');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs are append-only. Deletions are not allowed.');
});

auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are append-only. Updates are not allowed.');
});

auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs are append-only. Deletions are not allowed.');
});

// Indexes for efficient queries
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ targetDocumentId: 1, timestamp: -1 });
auditLogSchema.index({ targetCaseId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);