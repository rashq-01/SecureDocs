import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authApi from '../services/auth.api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Idle Session Auto-Logout (15 minutes)
  useEffect(() => {
    if (!user) return; // Only track when logged in

    const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
    let idleTimer;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        logout();
        toast.error('Session expired due to inactivity. Please log in again.');
      }, IDLE_TIMEOUT_MS);
    };

    // Events to track activity
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

    const handleActivity = () => {
      resetIdleTimer();
    };

    activityEvents.forEach(event => window.addEventListener(event, handleActivity));
    
    // Initialize timer
    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      const { user: userData, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      toast.success(`Welcome, ${userData.name}`);
      return { success: true };
    } catch (error) {
      let message = 'Login failed. Please try again.';
      if (error.response?.data?.error?.message) {
        message = error.response.data.error.message;
      } else if (error.message === 'Network Error') {
        message = 'Cannot connect to server. Please check if the backend is running.';
      }
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out');
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return false;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    hasPermission,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isIO: user?.role === 'IO',
    isReviewer: user?.role === 'Reviewer',
    isAuditor: user?.role === 'Auditor',
    isLegalLiaison: user?.role === 'LegalLiaison',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Also export AuthContext for direct use if needed
export { AuthContext };