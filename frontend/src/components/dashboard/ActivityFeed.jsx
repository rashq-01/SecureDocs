import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  FileUp,
  Eye,
  Download,
  RefreshCw,
  Shield,
  User,
} from 'lucide-react';

const ActivityFeed = ({ title = 'Activity Feed', maxItems = 20 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isConnected, on, joinRoom, leaveRoom } = useSocket();

  useEffect(() => {
    // Initial mock data
    const mockActivities = [
      {
        id: 1,
        action: 'DocumentUploaded',
        document: 'FIR-2026-001.pdf',
        actor: 'IO Sharma',
        timestamp: new Date(Date.now() - 120000),
        result: 'Success',
      },
      {
        id: 2,
        action: 'DocumentViewed',
        document: 'Forensic_Report_023.pdf',
        actor: 'Reviewer Patel',
        timestamp: new Date(Date.now() - 300000),
        result: 'Success',
      },
      {
        id: 3,
        action: 'DocumentStatusChanged',
        document: 'Court_Order_45.pdf',
        actor: 'Admin Kumar',
        timestamp: new Date(Date.now() - 600000),
        result: 'Success',
        metadata: { fromStatus: 'Draft', toStatus: 'UnderReview' },
      },
      {
        id: 4,
        action: 'Login',
        document: '—',
        actor: 'IO Sharma',
        timestamp: new Date(Date.now() - 1800000),
        result: 'Success',
      },
      {
        id: 5,
        action: 'DocumentDownloaded',
        document: 'Evidence_Log_001.pdf',
        actor: 'Legal Liaison Singh',
        timestamp: new Date(Date.now() - 2400000),
        result: 'Success',
      },
      {
        id: 6,
        action: 'SuspiciousActivity',
        document: 'Multiple downloads detected',
        actor: 'System',
        timestamp: new Date(Date.now() - 3600000),
        result: 'Warning',
        metadata: { rule: 'EXCESSIVE_DOWNLOADS', severity: 'HIGH' },
      },
    ];
    setActivities(mockActivities);
    setLoading(false);

    // Join activity room
    joinRoom('admin-room');

    // Listen for new activities
    const unsubscribe = on('activity:new', (data) => {
      const newActivity = {
        id: Date.now(),
        action: data.action || 'Unknown',
        document: data.documentId || data.document || 'Unknown',
        actor: data.actor || data.actorId || 'System',
        timestamp: new Date(data.timestamp || Date.now()),
        result: data.result || 'Success',
        metadata: data.metadata || {},
      };
      setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
    });

    // Listen for security alerts
    const securityUnsubscribe = on('security:alert', (data) => {
      const alertActivity = {
        id: Date.now(),
        action: 'SecurityAlert',
        document: `Rule: ${data.rule}`,
        actor: `System (${data.severity})`,
        timestamp: new Date(data.timestamp || Date.now()),
        result: 'Alert',
        metadata: { ...data },
      };
      setActivities((prev) => [alertActivity, ...prev].slice(0, maxItems));
    });

    return () => {
      unsubscribe?.();
      securityUnsubscribe?.();
      leaveRoom('admin-room');
    };
  }, []);

  const getActionIcon = (action) => {
    const icons = {
      DocumentUploaded: FileUp,
      DocumentViewed: Eye,
      DocumentDownloaded: Download,
      DocumentStatusChanged: RefreshCw,
      Login: User,
      Logout: User,
      LoginFailed: AlertTriangle,
      TamperDetected: AlertTriangle,
      SuspiciousActivity: Shield,
      SecurityAlert: Shield,
    };
    const Icon = icons[action] || Activity;
    return <Icon size={14} />;
  };

  const getActionColor = (action) => {
    const colors = {
      DocumentUploaded: 'text-status-info',
      DocumentViewed: 'text-text-secondary',
      DocumentDownloaded: 'text-text-secondary',
      DocumentStatusChanged: 'text-status-warning',
      Login: 'text-status-success',
      Logout: 'text-status-neutral',
      LoginFailed: 'text-status-danger',
      TamperDetected: 'text-status-danger',
      SuspiciousActivity: 'text-status-danger',
      SecurityAlert: 'text-status-danger',
    };
    return colors[action] || 'text-text-secondary';
  };

  const getActionLabel = (action) => {
    const labels = {
      DocumentUploaded: 'uploaded',
      DocumentViewed: 'viewed',
      DocumentDownloaded: 'downloaded',
      DocumentStatusChanged: 'changed status of',
      Login: 'logged in',
      Logout: 'logged out',
      LoginFailed: 'failed login attempt',
      TamperDetected: 'detected tampering in',
      SuspiciousActivity: 'detected suspicious activity',
      SecurityAlert: 'security alert',
    };
    return labels[action] || action.toLowerCase();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-md font-medium">{title}</h2>
        </div>
        <div className="text-sm text-text-secondary">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md font-medium">{title}</h2>
        <span className={`text-xs ${isConnected ? 'text-status-success' : 'text-status-danger'}`}>
          {isConnected ? '● Live' : '● Offline'}
        </span>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-8">No recent activity</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 py-2 border-b border-border last:border-0 hover:bg-bg-tertiary px-2 rounded transition-colors"
            >
              <div className={`mt-0.5 flex-shrink-0 ${getActionColor(activity.action)}`}>
                {getActionIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.actor || 'Unknown'}</span>
                  <span className="text-text-secondary"> {getActionLabel(activity.action)}</span>
                  <span className="font-mono text-xs text-text-secondary ml-1">
                    {typeof activity.document === 'string'
                      ? activity.document
                      : activity.document?.title || activity.document?._id || 'Unknown'}
                  </span>
                </p>
                {activity.metadata && activity.metadata.fromStatus && (
                  <p className="text-xs text-text-tertiary">
                    {activity.metadata.fromStatus} → {activity.metadata.toStatus}
                  </p>
                )}
                {activity.metadata && activity.metadata.rule && (
                  <p className="text-xs text-status-danger">
                    {activity.metadata.rule} ({activity.metadata.severity})
                  </p>
                )}
                {activity.result && activity.result !== 'Success' && activity.result !== 'Alert' && (
                  <p className="text-xs text-status-danger">Failed</p>
                )}
                {activity.result === 'Alert' && (
                  <p className="text-xs text-status-danger">⚠️ Alert</p>
                )}
              </div>
              <span className="text-xs text-text-tertiary whitespace-nowrap flex-shrink-0">
                {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;