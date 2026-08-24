const redis = require('redis');
const config = require('./env');
const logger = require('../utils/logger');

let client = null;
let isConnecting = false;

const createClient = () => {
  if (client && client.isOpen) {
    return client;
  }

  if (isConnecting) {
    return client;
  }

  try {
    isConnecting = true;
    
    if (!config.redisUrl || config.redisUrl === 'undefined') {
      logger.warn('Redis URL not configured, using memory store');
      isConnecting = false;
      return null;
    }

    client = redis.createClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnect attempts reached');
            return new Error('Redis max reconnect attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    client.on('connect', () => {
      logger.info('Redis connected successfully');
      isConnecting = false;
    });

    client.on('ready', () => {
      logger.info('Redis ready');
      isConnecting = false;
    });

    client.on('error', (err) => {
      if (err.message && err.message.includes('Socket already opened')) {
        // Ignore this specific error - it's a race condition
        return;
      }
      logger.error(`Redis error: ${err.message}`);
      isConnecting = false;
    });

    client.on('end', () => {
      logger.warn('Redis connection closed');
      isConnecting = false;
    });

    client.on('reconnecting', () => {
      logger.debug('Redis reconnecting...');
    });

    // Connect
    client.connect().catch((err) => {
      if (err.message && err.message.includes('Socket already opened')) {
        return;
      }
      logger.error(`Redis initial connection failed: ${err.message}`);
      isConnecting = false;
    });

    return client;
  } catch (error) {
    logger.error(`Redis setup error: ${error.message}`);
    isConnecting = false;
    return null;
  }
};

const connectRedis = async () => {
  try {
    if (client && client.isOpen) {
      return client;
    }

    if (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (client && client.isOpen) {
        return client;
      }
    }

    const newClient = createClient();
    if (!newClient) {
      return null;
    }

    // Wait for connection with timeout
    await Promise.race([
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 5000);
        
        newClient.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        newClient.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      }),
    ]);

    return newClient;
  } catch (error) {
    if (error.message && error.message.includes('Socket already opened')) {
      return client;
    }
    logger.warn(`Redis connection failed: ${error.message}`);
    return null;
  }
};

const getRedisClient = () => {
  if (!client || !client.isOpen) {
    return createClient();
  }
  return client;
};

module.exports = { 
  redisClient: client, 
  connectRedis,
  getRedisClient,
};