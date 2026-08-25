import api from './api';

export const login = (email, password) => {
  console.log('Login attempt:', email); // Debug log
  return api.post('/auth/login', { email, password });
};

export const refresh = () => {
  const refreshToken = localStorage.getItem('refreshToken');
  return api.post('/auth/refresh', { refreshToken });
};

export const logout = () => {
  return api.post('/auth/logout');
};

export const updatePreferences = (notificationPreferences) => {
  return api.patch('/auth/preferences', { notificationPreferences });
};

export const changePassword = (currentPassword, newPassword) => {
  return api.patch('/auth/password', { currentPassword, newPassword });
};