const config = require('../config/env');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[32m',
  reset: '\x1b[0m',
};

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  return `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`;
};

const logger = {
  error: (message, ...args) => {
    console.error(formatMessage('error', message), ...args);
  },
  warn: (message, ...args) => {
    console.warn(formatMessage('warn', message), ...args);
  },
  info: (message, ...args) => {
    console.info(formatMessage('info', message), ...args);
  },
  debug: (message, ...args) => {
    if (config.nodeEnv === 'development') {
      console.debug(formatMessage('debug', message), ...args);
    }
  },
};

module.exports = logger;