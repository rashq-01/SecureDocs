const Notification = require('../models/Notification.model');
const { successResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Get user's notifications
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = 'false' } = req.query;
    
    const filter = { userId: req.user._id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();
      
    const total = await Notification.countDocuments(filter);
    
    res.json(successResponse({
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    }, 'Notifications retrieved'));
  } catch (error) {
    logger.error(`Error fetching notifications: ${error.message}`);
    next(error);
  }
};

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
    }
    
    res.json(successResponse(notification, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    
    res.json(successResponse({}, 'All notifications marked as read'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
