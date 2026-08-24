import api from './api';

export const createAccessRequest = (data) => {
  return api.post('/access-requests', data);
};

export const getMyAccessRequests = (params) => {
  return api.get('/access-requests/me', { params });
};

export const getPendingAccessRequests = (documentId) => {
  return api.get(`/access-requests/document/${documentId}/pending`);
};

export const approveAccessRequest = (id, expiresInDays) => {
  return api.patch(`/access-requests/${id}/approve`, { expiresInDays });
};

export const rejectAccessRequest = (id, reason) => {
  return api.patch(`/access-requests/${id}/reject`, { reason });
};

export const validateAccessToken = (token, documentId) => {
  return api.get(`/access-requests/validate/${token}`, { params: { documentId } });
};

export const revokeAccessToken = (token) => {
  return api.post('/access-requests/revoke', { token });
};