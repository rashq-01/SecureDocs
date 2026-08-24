const { cleanupExpiredTokens } = require('../services/accessRequest.service');
const logger = require('../utils/logger');

/**
 * Run token cleanup job
 * Should be scheduled to run daily
 */
const runTokenCleanup = async () => {
  try {
    const count = await cleanupExpiredTokens();
    logger.info(`Token cleanup completed: ${count} tokens cleaned up`);
    return count;
  } catch (error) {
    logger.error(`Token cleanup failed: ${error.message}`);
    throw error;
  }
};

// Export for scheduled job
module.exports = { runTokenCleanup };