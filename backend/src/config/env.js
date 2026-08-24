const dotenv = require('dotenv');
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,
  
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  rateLimitWindowMin: parseInt(process.env.RATE_LIMIT_WINDOW_MIN) || 15,
  rateLimitMaxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5,
  
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 25,
  
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
};