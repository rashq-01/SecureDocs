import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { formatDistanceToNow } from 'date-fns';
import { User, Shield, Key, Search, Plus, MoreVertical, Check, X, Edit, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

const Users = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'IO',
    department: '',
  });

  // Fetch Users
  const { data: users, isLoading } = useQuery(['users', search], async () => {
    const res = await api.get(`/admin/users?search=${search}`);
    return res.data.data;
  });

  // Add User Mutation
  const addUserMutation = useMutation(
    (userData) => api.post('/admin/users', userData),
    {
      onSuccess: () => {
        toast.success('User created successfully');
        queryClient.invalidateQueries('users');
        setIsAddModalOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'IO', department: '' });
      },
      onError: (error) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create user');
      },
    }
  );

  // Toggle Active Status Mutation
  const toggleStatusMutation = useMutation(
    (userId) => api.patch(`/admin/users/${userId}/toggle-active`),
    {
      onSuccess: (res) => {
        const status = res.data.data.isActive ? 'activated' : 'deactivated';
        toast.success(`User ${status}`);
        queryClient.invalidateQueries('users');
      },
      onError: () => toast.error('Failed to update user status'),
    }
  );

  // Update Role Mutation
  const updateRoleMutation = useMutation(
    ({ userId, role }) => api.patch(`/admin/users/${userId}/role`, { role }),
    {
      onSuccess: () => {
        toast.success('User role updated');
        queryClient.invalidateQueries('users');
      },
      onError: () => toast.error('Failed to update user role'),
    }
  );

  const handleAddSubmit = (e) => {
    e.preventDefault();
    addUserMutation.mutate(newUser);
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      Admin: 'danger',
      IO: 'info',
      Reviewer: 'warning',
      LegalLiaison: 'success',
      Auditor: 'neutral',
    };
    return colors[role] || 'neutral';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">User Management</h1>
          <p className="text-sm text-text-secondary mt-1">Manage system users, roles, and access</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-text-tertiary">
                  <th className="pb-3 font-medium px-4">User</th>
                  <th className="pb-3 font-medium px-4">Role</th>
                  <th className="pb-3 font-medium px-4">Department</th>
                  <th className="pb-3 font-medium px-4">Status</th>
                  <th className="pb-3 font-medium px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users?.map((u) => (
                  <tr key={u._id} className="hover:bg-bg-tertiary/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-medium">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{u.name}</p>
                          <p className="text-xs text-text-secondary">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <select
                        className={`text-xs px-2 py-1 rounded-full bg-status-${getRoleBadgeColor(u.role)}Bg text-status-${getRoleBadgeColor(u.role)} font-medium border-none focus:ring-1 focus:ring-accent outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                        value={u.role}
                        onChange={(e) => updateRoleMutation.mutate({ userId: u._id, role: e.target.value })}
                        disabled={updateRoleMutation.isLoading || u._id === currentUser?._id}
                        title={u._id === currentUser?._id ? "You cannot change your own role" : "Change role"}
                      >
                        <option value="Admin">Admin</option>
                        <option value="IO">IO</option>
                        <option value="Reviewer">Reviewer</option>
                        <option value="LegalLiaison">LegalLiaison</option>
                        <option value="Auditor">Auditor</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 text-sm text-text-secondary">
                      {u.department || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {u.isActive ? 'Active Account' : 'Deactivated'}
                        </span>
                        <span className="text-[10px] text-text-tertiary font-medium">
                          {u.lastLogin ? `Last seen: ${formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })}` : 'Never logged in'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => toggleStatusMutation.mutate(u._id)}
                        disabled={u._id === currentUser?._id}
                        className={`p-1.5 rounded-md ${
                          u.isActive 
                            ? 'text-status-danger hover:bg-status-danger-bg' 
                            : 'text-status-success hover:bg-status-success-bg'
                        } disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors`}
                        title={u._id === currentUser?._id ? "You cannot deactivate yourself" : (u.isActive ? 'Deactivate User' : 'Activate User')}
                      >
                        {u.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
                {users?.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sm text-text-secondary">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-spatial">
          <div className="bg-bg-surfaceRaised w-full max-w-md rounded-xl border border-border shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-text-primary">Add New User</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. IO Sharma"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="sharma@securedocs.local"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Minimum 6 characters"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Role</label>
                  <select
                    className="input-field"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="Admin">Admin</option>
                    <option value="IO">Investigating Officer (IO)</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="LegalLiaison">Legal Liaison</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Department</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Optional"
                    value={newUser.department}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isLoading}
                  className="btn-primary"
                >
                  {addUserMutation.isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
