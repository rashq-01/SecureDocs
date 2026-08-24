const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  assignedOfficers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  status: {
    type: String,
    enum: ['Open', 'InProgress', 'UnderReview', 'Closed', 'Archived'],
    default: 'Open',
    index: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  description: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  closedAt: {
    type: Date,
  },
  archivedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
caseSchema.index({ department: 1, status: 1 });
caseSchema.index({ priority: 1, status: 1 });
caseSchema.index({ tags: 1 });

// Method to check if case is active
caseSchema.methods.isActive = function() {
  return ['Open', 'InProgress', 'UnderReview'].includes(this.status);
};

// Method to check if user is assigned to case
caseSchema.methods.isAssignedTo = function(userId) {
  return this.assignedOfficers.some(id => id.toString() === userId.toString());
};

// NO virtuals that could cause issues
// NO pre-find middleware

module.exports = mongoose.model('Case', caseSchema);