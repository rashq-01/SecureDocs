const { Server } = require('socket.io');
const { verifyAccessToken, isTokenBlacklisted } = require('../services/auth.service');
const User = require('../models/User.model');
const logger = require('../utils/logger');

let io;

/**
 * Initialize Socket.IO server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      // Check if token is blacklisted
      const isBlacklisted = await isTokenBlacklisted(token);
      if (isBlacklisted) {
        return next(new Error('Token revoked'));
      }

      // Verify token
      const decoded = verifyAccessToken(token);
      
      // Get user
      const user = await User.findById(decoded.userId)
        .select('-passwordHash')
        .populate('assignedCases', 'caseId title');

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = user;
      socket.token = token;
      next();
    } catch (error) {
      logger.error(`Socket auth error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.email} (${user.role})`);

    // Join appropriate rooms based on role
    joinRooms(socket, user);

    // Handle room join request
    socket.on('join', (room) => {
      if (canJoinRoom(room, user)) {
        socket.join(room);
        logger.debug(`${user.email} joined room: ${room}`);
      }
    });

    // Handle room leave request
    socket.on('leave', (room) => {
      socket.leave(room);
      logger.debug(`${user.email} left room: ${room}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.email}`);
    });
  });

  return io;
};

/**
 * Join user to relevant rooms based on role
 */
const joinRooms = (socket, user) => {
  // Admin room - all system events
  if (user.role === 'Admin') {
    socket.join('admin-room');
  }

  // Department room - for reviewers
  if (user.department) {
    socket.join(`dept:${user.department}`);
  }

  // Case rooms - for IO and reviewers
  if (user.assignedCases && user.assignedCases.length > 0) {
    user.assignedCases.forEach(caseData => {
      socket.join(`case:${caseData._id.toString()}`);
    });
  }
};

/**
 * Check if a user can join a room
 */
const canJoinRoom = (room, user) => {
  // Admin can join any room
  if (user.role === 'Admin') return true;

  // Department rooms
  if (room.startsWith('dept:')) {
    const dept = room.replace('dept:', '');
    return user.department === dept;
  }

  // Case rooms
  if (room.startsWith('case:')) {
    const caseId = room.replace('case:', '');
    return user.assignedCases.some(c => c._id.toString() === caseId);
  }

  // Admin room is admin-only
  if (room === 'admin-room') {
    return user.role === 'Admin';
  }

  return false;
};

/**
 * Get socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit an activity event to relevant rooms
 */
const emitActivity = (data) => {
  if (!io) return;

  const { action, documentId, caseId, actor, department } = data;

  // Emit to admin room
  io.to('admin-room').emit('activity:new', {
    ...data,
    timestamp: new Date().toISOString(),
  });

  // Emit to case room
  if (caseId) {
    io.to(`case:${caseId}`).emit('activity:new', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit to department room
  if (department) {
    io.to(`dept:${department}`).emit('activity:new', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit tamper alert
  if (action === 'TamperDetected') {
    io.to('admin-room').emit('tamper:alert', {
      documentId,
      detectedBy: actor,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit status change
  if (action === 'StatusChange') {
    io.to('admin-room').emit('document:statusChanged', {
      documentId,
      ...data.metadata,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  emitActivity,
};