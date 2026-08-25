const config = require('./config/env'); // MUST be loaded first!
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./sockets');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Connect to MongoDB
connectDB();

// Connect to Redis (non-blocking)
const initRedis = async () => {
  try {
    const redisClient = await connectRedis();
    if (redisClient) {
      logger.info('Redis connected successfully');
    } else {
      logger.warn('Redis connection failed - rate limiting will use memory store');
    }
  } catch (error) {
    logger.warn(`Redis connection failed: ${error.message}`);
    logger.warn('Rate limiting will use memory store as fallback');
  }
};

// Start Redis connection in background
setTimeout(initRedis, 1000);

// Connect to RabbitMQ (non-blocking)
const { connectRabbitMQ, getChannel } = require('./config/rabbitmq');
setTimeout(connectRabbitMQ, 1500);

// Start Background Jobs
const { startAiAnomalyScanner } = require('./jobs/aiAnomalyScan');
setTimeout(startAiAnomalyScanner, 2000); // Start scanner 2s after boot

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  logger.info(`API available at http://localhost:${PORT}/api/v1`);
  logger.info(`Socket.IO available at http://localhost:${PORT}`);
});

// Handle shutdown gracefully
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
  
  const { redisClient } = require('./config/redis');
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
  
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  // Don't exit immediately - allow graceful shutdown
  setTimeout(shutdown, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}`);
  logger.error(`Reason: ${reason}`);
  // Don't exit immediately - allow graceful shutdown
  setTimeout(shutdown, 1000);
});

module.exports = { app, server, io };