const { getIO, emitActivity } = require('./index');
const logger = require('../utils/logger');

/**
 * Emit a new activity event
 */
const emitNewActivity = (data) => {
  try {
    emitActivity(data);
    logger.debug(`Activity emitted: ${data.action}`);
  } catch (error) {
    logger.error(`Failed to emit activity: ${error.message}`);
  }
};

/**
 * Broadcast tamper alert
 */
const emitTamperAlert = (data) => {
  try {
    const io = getIO();
    io.to('admin-room').emit('tamper:alert', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    logger.warn(`Tamper alert emitted for doc: ${data.documentId}`);
  } catch (error) {
    logger.error(`Failed to emit tamper alert: ${error.message}`);
  }
};

/**
 * Broadcast status change
 */
const emitStatusChange = (data) => {
  try {
    const io = getIO();
    io.to('admin-room').emit('document:statusChanged', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    if (data.caseId) {
      io.to(`case:${data.caseId}`).emit('document:statusChanged', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
    logger.debug(`Status change emitted: ${data.documentId} -> ${data.toStatus}`);
  } catch (error) {
    logger.error(`Failed to emit status change: ${error.message}`);
  }
};

module.exports = {
  emitNewActivity,
  emitTamperAlert,
  emitStatusChange,
};