import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as documentApi from '../../services/document.api';
import { getUsers } from '../../services/admin.api';
import { PERMISSIONS } from '../../utils/constants';
import { UserPlus, UserMinus, Shield, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const DocumentPermissions = ({ documentId }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('VIEW');

  useEffect(() => {
    fetchData();
  }, [documentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permsRes, usersRes] = await Promise.all([
        documentApi.getDocumentPermissions(documentId),
        getUsers(),
      ]);
      setPermissions(permsRes.data.data || {});
      setUsers(usersRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedUser || !selectedPermission) {
      toast.error('Please select a user and permission');
      return;
    }

    try {
      await documentApi.grantPermission(documentId, selectedUser, selectedPermission);
      toast.success('Permission granted successfully');
      fetchData();
      setSelectedUser('');
      setSelectedPermission('VIEW');
    } catch (error) {
      console.error('Failed to grant permission:', error);
      toast.error('Failed to grant permission');
    }
  };

  const handleRevokePermission = async (userId, permission) => {
    if (!confirm(`Revoke ${permission} permission from this user?`)) return;

    try {
      await documentApi.revokePermission(documentId, userId, permission);
      toast.success('Permission revoked successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      toast.error('Failed to revoke permission');
    }
  };

  const getPermissionColor = (permission) => {
    const colors = {
      VIEW: 'badge-info',
      DOWNLOAD: 'badge-success',
      SHARE: 'badge-warning',
      EDIT: 'badge-danger',
      DELETE: 'badge-danger',
    };
    return colors[permission] || 'badge-neutral';
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading permissions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Grant Permission */}
      <div className="card">
        <h3 className="text-md font-medium mb-4">Grant Permission</h3>
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="input-field flex-1 min-w-[200px]"
          >
            <option value="">Select User</option>
            {users
              .filter(u => u._id !== user?._id)
              .map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email}) - {u.role}
                </option>
              ))}
          </select>
          <select
            value={selectedPermission}
            onChange={(e) => setSelectedPermission(e.target.value)}
            className="input-field w-40"
          >
            {Object.values(PERMISSIONS).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={handleGrantPermission}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus size={16} /> Grant
          </button>
        </div>
      </div>

      {/* Current Permissions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium">Current Permissions</h3>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {Object.keys(permissions).length === 0 ? (
          <p className="text-sm text-text-tertiary">No permissions granted</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(permissions).map(([userId, perms]) => {
              const userData = users.find(u => u._id === userId);
              return (
                <div key={userId} className="flex items-center justify-between p-3 bg-bg-secondary rounded">
                  <div>
                    <p className="text-sm font-medium">
                      {userData?.name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {userData?.email || 'Unknown email'} • {userData?.role || 'Unknown role'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {perms.map((perm) => (
                        <span key={perm} className={`badge ${getPermissionColor(perm)}`}>
                          {perm}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleRevokePermission(userId, perms[0])}
                      className="text-text-tertiary hover:text-status-danger transition-colors"
                      title="Revoke all permissions"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPermissions;