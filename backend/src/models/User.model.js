const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'IO', 'Reviewer', 'LegalLiaison', 'Auditor'],
    required: true,
    index: true,
  },
  department: {
    type: String,
    trim: true,
  },
  assignedCases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    documentUpdates: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
});

// Virtual for assigned case IDs as strings (for easier comparison)
userSchema.virtual('assignedCaseIds').get(function() {
  return this.assignedCases.map(id => id.toString());
});

// Method to check if user has a specific role
userSchema.methods.hasRole = function(role) {
  if (Array.isArray(role)) {
    return role.includes(this.role);
  }
  return this.role === role;
};

// Method to check if user can access a case
userSchema.methods.canAccessCase = function(caseId) {
  if (this.role === 'Admin') return true;
  if (this.role === 'IO') {
    return this.assignedCases.some(id => id.toString() === caseId.toString());
  }
  if (this.role === 'Reviewer') {
    // Reviewer can access all cases in their department
    // This needs the case to be populated
    return true;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);