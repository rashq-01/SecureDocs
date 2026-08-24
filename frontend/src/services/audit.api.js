import api from './api';

export const getAuditLogs = (params) => {
  return api.get('/audit-logs', { params });
};

export const verifyAuditIntegrity = () => {
  return api.get('/audit-logs/verify');
};

export const getSecurityEvents = (timeframe = '24h') => {
  return api.get('/audit-logs/security-events', { params: { timeframe } });
};