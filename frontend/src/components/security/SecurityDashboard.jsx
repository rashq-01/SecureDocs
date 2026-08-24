import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getSecurityDashboard } from '../../services/security.api';
import StatCard from '../dashboard/StatCard';
import ActivityFeed from '../dashboard/ActivityFeed';
import {
  Shield,
  AlertTriangle,
  Eye,
  Clock,
  UserX,
  FileWarning,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SecurityDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getSecurityDashboard();
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      toast.error('Failed to load security dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <Shield size={48} className="mx-auto text-text-tertiary mb-4" />
        <p className="text-text-secondary">No security data available</p>
      </div>
    );
  }

  const summary = data.summary || {};

  const statCards = [
    {
      label: 'Failed Logins',
      value: summary.failedLogins || 0,
      icon: UserX,
      color: 'red',
    },
    {
      label: 'Unauthorized Attempts',
      value: summary.unauthorizedAttempts || 0,
      icon: Eye,
      color: 'red',
    },
    {
      label: 'Tamper Detections',
      value: summary.tamperDetections || 0,
      icon: FileWarning,
      color: 'red',
    },
    {
      label: 'Suspicious Activities',
      value: summary.suspiciousActivities || 0,
      icon: AlertTriangle,
      color: 'yellow',
    },
    {
      label: 'Active Users (24h)',
      value: summary.activeUsers || 0,
      icon: Clock,
      color: 'green',
    },
    {
      label: 'Permission Changes',
      value: summary.permissionChanges || 0,
      icon: Shield,
      color: 'blue',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-md font-medium">Security Overview</h2>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed title="Security Events" />
        <div className="card">
          <h3 className="text-md font-medium mb-4">Recent Alerts</h3>
          {data.recentAlerts?.length === 0 ? (
            <p className="text-sm text-text-tertiary">No recent alerts</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.recentAlerts?.slice(0, 10).map((alert, index) => (
                <div key={index} className="flex items-start gap-3 p-2 border-b border-border last:border-0">
                  <AlertTriangle size={14} className="text-status-warning mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{alert.action}</p>
                    <p className="text-xs text-text-secondary">
                      {alert.actorId?.name || 'System'} • {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    alert.metadata?.severity === 'CRITICAL' || alert.metadata?.severity === 'HIGH'
                      ? 'bg-status-dangerBg text-status-danger'
                      : 'bg-status-warningBg text-status-warning'
                  }`}>
                    {alert.metadata?.severity || 'MEDIUM'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;