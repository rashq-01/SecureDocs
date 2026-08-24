import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useSocket } from '../../hooks/useSocket';
import StatCard from './StatCard';
import ActivityFeed from './ActivityFeed';
import SecurityWidget from './SecurityWidget';
import { getSecurityDashboard } from '../../services/security.api';
import {
  FileText,
  Users,
  Clock,
  Activity,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { isConnected } = useSocket();
  const [securityStats, setSecurityStats] = useState(null);

  const { data: stats, isLoading, refetch } = useQuery(
    'admin-stats',
    async () => {
      const response = await fetch('/api/v1/admin/dashboard-stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      return data.data;
    },
    {
      refetchInterval: 30000,
    }
  );

  useEffect(() => {
    const fetchSecurityStats = async () => {
      try {
        const response = await getSecurityDashboard();
        setSecurityStats(response.data.data);
      } catch (error) {
        console.error('Failed to fetch security stats:', error);
      }
    };
    fetchSecurityStats();
  }, []);

  const statCards = [
    {
      label: 'Total Documents',
      value: stats?.totalDocuments || 0,
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Pending Review',
      value: stats?.pendingReviews || 0,
      icon: Clock,
      color: 'yellow',
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: Users,
      color: 'green',
    },
    {
      label: 'Recent Activities',
      value: stats?.recentActivities || 0,
      icon: Activity,
      color: 'purple',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isConnected ? 'text-status-success' : 'text-status-danger'}`}>
            {isConnected ? '● Live' : '● Offline'}
          </span>
          <button
            onClick={() => refetch()}
            className="text-text-secondary hover:text-text-primary text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {securityStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-status-dangerBg text-status-danger">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Tamper Detections</p>
                <p className="text-xl font-semibold">{securityStats.summary?.tamperDetections || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-status-warningBg text-status-warning">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Suspicious Activities</p>
                <p className="text-xl font-semibold">{securityStats.summary?.suspiciousActivities || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-status-dangerBg text-status-danger">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs text-text-secondary uppercase tracking-wider">Failed Logins</p>
                <p className="text-xl font-semibold">{securityStats.summary?.failedLogins || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed title="Recent Activity" />
        </div>
        <div className="lg:col-span-1">
          {securityStats && <SecurityWidget data={securityStats} />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;