import api from './api';

export const getDocuments = (params) => {
  return api.get('/documents', { params });
};

export const getDocument = (id) => {
  return api.get(`/documents/${id}`);
};

export const uploadDocument = (formData) => {
  return api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const downloadDocument = (id) => {
  return api.get(`/documents/${id}/download`, { responseType: 'blob' });
};

export const previewDocument = (id) => {
  return api.get(`/documents/${id}/preview`, { responseType: 'blob' });
};

export const updateDocumentStatus = (id, status) => {
  return api.patch(`/documents/${id}/status`, { status });
};

export const verifySignature = (id) => {
  return api.get(`/documents/${id}/verify-signature`);
};

// Versions
export const getDocumentVersions = (documentId) => {
  return api.get(`/documents/${documentId}/versions`);
};

export const downloadVersion = (documentId, versionNumber) => {
  return api.get(`/documents/${documentId}/versions/${versionNumber}/download`, {
    responseType: 'blob',
  });
};

export const previewVersion = (documentId, versionNumber) => {
  return api.get(`/documents/${documentId}/versions/${versionNumber}/preview`, {
    responseType: 'blob',
  });
};

export const createVersion = (documentId, formData) => {
  return api.post(`/documents/${documentId}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Deletion
export const archiveDocument = (id, reason) => {
  return api.post(`/documents/${id}/archive`, { reason });
};

export const softDeleteDocument = (id, reason) => {
  return api.post(`/documents/${id}/delete`, { reason });
};

export const restoreDocument = (id, reason) => {
  return api.post(`/documents/${id}/restore`, { reason });
};

export const permanentDeleteDocument = (id) => {
  return api.delete(`/documents/${id}/permanent`);
};

// Permissions
export const grantPermission = (documentId, userId, permission) => {
  return api.post(`/documents/${documentId}/permissions/grant`, {
    userId,
    permission,
  });
};

export const revokePermission = (documentId, userId, permission) => {
  return api.post(`/documents/${documentId}/permissions/revoke`, {
    userId,
    permission,
  });
};

export const getDocumentPermissions = (documentId) => {
  return api.get(`/documents/${documentId}/permissions`);
};

// Shares
export const createShare = (data) => {
  return api.post('/shares', data);
};

export const getShares = () => {
  return api.get('/shares/created-by-me');
};

export const revokeShare = (token) => {
  return api.delete(`/shares/${token}/revoke`);
};

export const validateShare = (token) => {
  return api.get(`/shares/validate/${token}`);
};

export const accessShare = (token) => {
  return api.get(`/shares/access/${token}`);
};