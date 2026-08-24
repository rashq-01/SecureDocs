import api from './api';

/**
 * Get dashboard statistics (Admin only)
 */
export const getDashboardStats = () => {
  return api.get('/admin/dashboard-stats');
};

/**
 * Get users list (Admin only)
 */
export const getUsers = (params = {}) => {
  return api.get('/admin/users', { params });
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = (userId, role) => {
  return api.patch(`/admin/users/${userId}/role`, { role });
};

/**
 * Toggle user active status (Admin only)
 */
export const toggleUserActive = (userId) => {
  return api.patch(`/admin/users/${userId}/toggle-active`);
};