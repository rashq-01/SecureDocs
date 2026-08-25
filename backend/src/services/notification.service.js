const Notification = require('../models/Notification.model');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

/**
 * Centralized helper to create a notification and emit it via Socket.IO
 */
const createNotification = async ({ userId, type, message, relatedDocumentId = null, relatedCaseId = null }) => {
  try {
    const notification = new Notification({
      userId,
      type,
      message,
      relatedDocumentId,
      relatedCaseId,
    });
    
    await notification.save();
    
    // Emit via Socket.IO directly to the user's room
    try {
      const io = getIO();
      io.to(`user_${userId.toString()}`).emit('notification:new', notification);
    } catch (socketError) {
      // Don't fail the operation if socket emission fails (e.g. user not connected)
      logger.warn(`Failed to emit notification to user ${userId}: ${socketError.message}`);
    }
    
    return notification;
  } catch (error) {
    logger.error(`Error creating notification: ${error.message}`);
    // Don't throw, let the main action succeed even if notification fails
    return null;
  }
};

module.exports = {
  createNotification
};
