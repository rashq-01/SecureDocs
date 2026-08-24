import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as documentApi from '../../services/document.api';
import { getUsers } from '../../services/admin.api';
import { PERMISSIONS } from '../../utils/constants';
import { Share2, Copy, Check, Clock, UserX, RefreshCw } from 'lucide-react';
import { formatDate, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DocumentShare = ({ documentId, document }) => {
  const { user } = useAuth();
  const [shares, setShares] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    sharedWith: '',
    permission: 'VIEW',
    expiresInHours: 24,
    message: '',
    maxAccessCount: null,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [documentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sharesRes, usersRes] = await Promise.all([
        documentApi.getShares(),
        getUsers(),
      ]);
      // Filter shares for this document
      const docShares = sharesRes.data.data?.filter(s => s.documentId?._id === documentId) || [];
      setShares(docShares);
      setUsers(usersRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shares:', error);
      toast.error('Failed to load shares');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    if (!formData.sharedWith) {
      toast.error('Please select a user');
      return;
    }

    try {
      const response = await documentApi.createShare({
        documentId,
        sharedWith: formData.sharedWith,
        permission: formData.permission,
        expiresInHours: formData.expiresInHours,
        message: formData.message,
        maxAccessCount: formData.maxAccessCount || null,
      });
      
      toast.success('Share created successfully');
      setFormData({
        sharedWith: '',
        permission: 'VIEW',
        expiresInHours: 24,
        message: '',
        maxAccessCount: null,
      });
      fetchData();
      
      // Copy share link to clipboard
      const shareLink = response.data.data.shareLink;
      if (shareLink) {
        await navigator.clipboard.writeText(`${window.location.origin}${shareLink}`);
        toast.success('Share link copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to create share:', error);
      toast.error('Failed to create share');
    }
  };

  const handleRevokeShare = async (token) => {
    if (!confirm('Revoke this share?')) return;

    try {
      await documentApi.revokeShare(token);
      toast.success('Share revoked successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to revoke share:', error);
      toast.error('Failed to revoke share');
    }
  };

  const handleCopyLink = (token) => {
    const link = `${window.location.origin}/api/v1/shares/access/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  const getStatusColor = (status) => {
    const colors = {
      Active: 'badge-success',
      Expired: 'badge-danger',
      Revoked: 'badge-neutral',
    };
    return colors[status] || 'badge-neutral';
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
    return <div className="text-sm text-text-secondary">Loading shares...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Share */}
      <div className="card">
        <h3 className="text-md font-medium mb-4">Share Document</h3>
        <form onSubmit={handleCreateShare} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                User <span className="text-status-danger">*</span>
              </label>
              <select
                value={formData.sharedWith}
                onChange={(e) => setFormData(prev => ({ ...prev, sharedWith: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select User</option>
                {users
                  .filter(u => u._id !== user?._id)
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Permission <span className="text-status-danger">*</span>
              </label>
              <select
                value={formData.permission}
                onChange={(e) => setFormData(prev => ({ ...prev, permission: e.target.value }))}
                className="input-field"
              >
                {Object.values(PERMISSIONS).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Expires in (hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={formData.expiresInHours}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresInHours: parseInt(e.target.value) || 24 }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Max Access Count (optional)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={formData.maxAccessCount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, maxAccessCount: e.target.value ? parseInt(e.target.value) : null }))}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Message (optional)
            </label>
            <input
              type="text"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="input-field"
              placeholder="Add a personal message..."
            />
          </div>

          <button type="submit" className="btn-primary flex items-center gap-2">
            <Share2 size={16} /> Create Share
          </button>
        </form>
      </div>

      {/* Existing Shares */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium">Active Shares</h3>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {shares.length === 0 ? (
          <p className="text-sm text-text-tertiary">No shares created</p>
        ) : (
          <div className="space-y-3">
            {shares.map((share) => (
              <div key={share._id} className="flex items-start justify-between p-3 bg-bg-secondary rounded">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {share.sharedWith?.name || 'Unknown User'}
                    </span>
                    <span className={`badge ${getStatusColor(share.status)}`}>
                      {share.status}
                    </span>
                    <span className={`badge ${getPermissionColor(share.permission)}`}>
                      {share.permission}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    <span>Created: {timeAgo(share.createdAt)}</span>
                    <span className="mx-2">•</span>
                    <span>Expires: {formatDate(share.expiresAt)}</span>
                    {share.maxAccessCount && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Accesses: {share.accessCount}/{share.maxAccessCount}</span>
                      </>
                    )}
                    {share.message && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="italic">"{share.message}"</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopyLink(share.shareToken)}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                    title="Copy link"
                  >
                    {copied ? <Check size={16} className="text-status-success" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => handleRevokeShare(share.shareToken)}
                    className="text-text-tertiary hover:text-status-danger transition-colors"
                    title="Revoke share"
                  >
                    <UserX size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentShare;