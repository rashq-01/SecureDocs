import api from './api';

export const getSecurityDashboard = () => {
  return api.get('/security/dashboard');
};

export const getSuspiciousActivities = (params) => {
  return api.get('/security/suspicious', { params });
};

export const getDetectionRules = () => {
  return api.get('/security/rules');
};