import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import SecurityDashboard from '../components/security/SecurityDashboard';
import SuspiciousActivityList from '../components/security/SuspiciousActivityList';
import DetectionRules from '../components/security/DetectionRules';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Shield } from 'lucide-react';

const Security = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Only Admin can access security
  if (user?.role !== 'Admin') {
    return (
      <div className="card text-center py-12">
        <Shield size={48} className="mx-auto text-text-tertiary mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
        <p className="text-text-secondary">Only Administrators can access the security dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-6">Security Dashboard</h1>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`tab ${activeTab === 'dashboard' ? 'tab-active' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('suspicious')}
            className={`tab ${activeTab === 'suspicious' ? 'tab-active' : ''}`}
          >
            Suspicious Activity
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`tab ${activeTab === 'rules' ? 'tab-active' : ''}`}
          >
            Detection Rules
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'dashboard' && <SecurityDashboard />}
        {activeTab === 'suspicious' && <SuspiciousActivityList />}
        {activeTab === 'rules' && <DetectionRules />}
      </div>
    </div>
  );
};

export default Security;