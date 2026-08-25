const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['DocumentStatusChanged', 'NewDocumentInCase', 'AccessRequestSubmitted', 'AccessRequestStatusChanged', 'SystemAlert'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null,
  },
  relatedCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for efficient querying of user's notifications
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
