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