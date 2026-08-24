import React, { createContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const token = localStorage.getItem('accessToken');

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      toast.success('Connected to real-time updates');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('activity:new', (data) => {
      // Handle new activity
      console.log('New activity:', data);
    });

    socket.on('tamper:alert', (data) => {
      toast.error(`⚠️ Tamper detected on document: ${data.documentId}`);
    });

    socket.on('document:statusChanged', (data) => {
      toast.info(`Document status changed: ${data.documentId} → ${data.toStatus}`);
    });

    socket.on('security:alert', (data) => {
      toast.warning(`Security alert: ${data.rule} (${data.severity})`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user, isAuthenticated]);

  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => socketRef.current?.off(event, callback);
    }
    return () => {};
  };

  const joinRoom = (room) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join', room);
    }
  };

  const leaveRoom = (room) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave', room);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        emit,
        on,
        joinRoom,
        leaveRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};