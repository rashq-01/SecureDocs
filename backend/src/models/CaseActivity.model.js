const mongoose = require('mongoose');

const caseActivitySchema = new mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true,
    index: true,
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    enum: [
      'Created',
      'Updated',
      'StatusChanged',
      'MemberAdded',
      'MemberRemoved',
      'DocumentUploaded',
      'DocumentDeleted',
      'DocumentArchived',
      'DocumentRestored',
      'PriorityChanged',
      'TagAdded',
      'TagRemoved',
      'DescriptionUpdated',
      'TitleUpdated',
    ],
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

caseActivitySchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model('CaseActivity', caseActivitySchema);