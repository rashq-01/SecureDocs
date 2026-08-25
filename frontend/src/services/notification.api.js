import api from './api';

export const getNotifications = (params = { limit: 20, skip: 0, unreadOnly: false }) => {
  return api.get('/notifications', { params });
};

export const markAsRead = (id) => {
  return api.patch(`/notifications/${id}/read`);
};

export const markAllAsRead = () => {
  return api.patch('/notifications/read-all');
};
