import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Settings as SettingsIcon, User, Shield, Bell } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

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
            <div className="space-y-4">
              <div>
                <button className="btn-primary">Change Password</button>
              </div>
              <div>
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
                <input type="checkbox" className="w-4 h-4" defaultChecked />
                <span className="text-sm">Email notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" defaultChecked />
                <span className="text-sm">Security alerts</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
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