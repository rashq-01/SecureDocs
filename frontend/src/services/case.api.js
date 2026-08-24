import api from './api';

export const getCases = (params) => {
  return api.get('/cases', { params });
};

export const getCase = (id) => {
  console.log('API call: getCase with ID:', id);
  return api.get(`/cases/${id}`);
};

export const createCase = (data) => {
  return api.post('/cases', data);
};

export const updateCase = (id, data) => {
  return api.put(`/cases/${id}`, data);
};

export const updateCaseStatus = (id, status, reason) => {
  return api.patch(`/cases/${id}/status`, { status, reason });
};

export const addCaseMembers = (id, officerIds) => {
  return api.post(`/cases/${id}/members`, { officerIds });
};

export const removeCaseMember = (id, userId) => {
  return api.delete(`/cases/${id}/members/${userId}`);
};

export const addCaseTags = (id, tags) => {
  return api.post(`/cases/${id}/tags`, { tags });
};

export const removeCaseTags = (id, tags) => {
  return api.delete(`/cases/${id}/tags`, { data: { tags } });
};

export const getCaseActivities = (id, params) => {
  return api.get(`/cases/${id}/activities`, { params });
};