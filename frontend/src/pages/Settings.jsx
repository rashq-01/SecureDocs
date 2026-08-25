import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Settings as SettingsIcon, User, Shield, Bell } from 'lucide-react';
import * as authApi from '../services/auth.api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  
  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    securityAlerts: true,
    documentUpdates: true,
  });

  useEffect(() => {
    if (user && user.notificationPreferences) {
      setPreferences(user.notificationPreferences);
    }
    setTimeout(() => setLoading(false), 500);
  }, [user]);

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    setSaving(true);
    try {
      const response = await authApi.updatePreferences(newPreferences);
      updateUser(response.data.data.user);
      toast.success('Preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setPasswordChanging(true);
    try {
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setPasswordChanging(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-6">Settings</h1>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`tab ${activeTab === 'profile' ? 'tab-active' : ''}`}
          >
            <User size={16} className="inline mr-2" /> Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`tab ${activeTab === 'security' ? 'tab-active' : ''}`}
          >
            <Shield size={16} className="inline mr-2" /> Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`tab ${activeTab === 'notifications' ? 'tab-active' : ''}`}
          >
            <Bell size={16} className="inline mr-2" /> Notifications
          </button>
        </nav>
      </div>

      <div className="card">
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-md font-medium mb-4">Profile Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
                <input type="text" value={user?.name || ''} className="input-field" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                <input type="email" value={user?.email || ''} className="input-field" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Role</label>
                <input type="text" value={user?.role || ''} className="input-field" disabled />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h2 className="text-md font-medium mb-4">Security Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-text-primary mb-3">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Current Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">New Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                      minLength={6}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={passwordChanging}
                  >
                    {passwordChanging ? 'Changing...' : 'Update Password'}
                  </button>
                </form>
              </div>
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text-primary mb-2">Active Sessions</h3>
                <p className="text-sm text-text-secondary">No active sessions</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-md font-medium mb-4">Notification Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4" 
                  checked={preferences.emailNotifications}
                  onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  disabled={saving}
                />
                <span className="text-sm">Email notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4" 
                  checked={preferences.securityAlerts}
                  onChange={(e) => handlePreferenceChange('securityAlerts', e.target.checked)}
                  disabled={saving}
                />
                <span className="text-sm">Security alerts</span>
              </label>
              <label className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4"
                  checked={preferences.documentUpdates}
                  onChange={(e) => handlePreferenceChange('documentUpdates', e.target.checked)}
                  disabled={saving}
                />
                <span className="text-sm">Document updates</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;