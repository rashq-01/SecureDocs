const AuditLog = require('../models/AuditLog.model');
const User = require('../models/User.model');
const { publishAITask } = require('../queues/aiTasks.queue');
const logger = require('../utils/logger');

const SCAN_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

const startAiAnomalyScanner = () => {
  logger.info('🤖 Starting AI Anomaly Detection Scanner...');
  
  const runScan = async () => {
    try {
      logger.debug('🤖 Running scheduled AI Anomaly Scan cycle...');
      const since = new Date(Date.now() - SCAN_INTERVAL_MS);
      
      // Find users who have been active in the last SCAN_INTERVAL
      const activeUserIds = await AuditLog.distinct('actorId', {
        timestamp: { $gte: since }
      });

      if (activeUserIds.length === 0) {
        return; // No activity to scan
      }

      logger.info(`🤖 Found ${activeUserIds.length} active users for AI anomaly scanning.`);

      // For each active user, gather their recent logs and queue an AI task
      for (const userId of activeUserIds) {
        // Fetch last 50 logs for context
        const recentLogs = await AuditLog.find({ actorId: userId })
          .sort({ timestamp: -1 })
          .limit(50)
          .select('action targetDocumentId ipAddress result metadata timestamp')
          .lean();

        // Queue it to RabbitMQ
        await publishAITask('ANOMALY_CHECK', {
          userId,
          recentLogs
        });
      }
    } catch (error) {
      logger.error(`❌ AI Anomaly Scanner failed: ${error.message}`);
    }
  };

  // Run immediately, then on interval
  runScan();
  setInterval(runScan, SCAN_INTERVAL_MS);
};

module.exports = {
  startAiAnomalyScanner
};
