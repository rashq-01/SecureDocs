import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Eye, Clock } from 'lucide-react';

const SecurityWidget = ({ data }) => {
  const navigate = useNavigate();

  const alerts = data?.recentAlerts || [];
  const summary = data?.summary || {};

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: 'text-status-danger bg-status-dangerBg',
      HIGH: 'text-status-danger bg-status-dangerBg',
      MEDIUM: 'text-status-warning bg-status-warningBg',
      LOW: 'text-status-neutral bg-status-neutralBg',
    };
    return colors[severity] || 'text-status-neutral bg-status-neutralBg';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md font-medium">Security Overview</h2>
        <button
          onClick={() => navigate('/security')}
          className="text-xs text-accent hover:underline"
        >
          View All →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-secondary rounded p-3 text-center">
          <p className="text-lg font-semibold">{summary.failedLogins || 0}</p>
          <p className="text-xs text-text-secondary">Failed Logins</p>
        </div>
        <div className="bg-bg-secondary rounded p-3 text-center">
          <p className="text-lg font-semibold">{summary.tamperDetections || 0}</p>
          <p className="text-xs text-text-secondary">Tamper Detections</p>
        </div>
        <div className="bg-bg-secondary rounded p-3 text-center">
          <p className="text-lg font-semibold">{summary.suspiciousActivities || 0}</p>
          <p className="text-xs text-text-secondary">Suspicious</p>
        </div>
        <div className="bg-bg-secondary rounded p-3 text-center">
          <p className="text-lg font-semibold">{summary.unauthorizedAttempts || 0}</p>
          <p className="text-xs text-text-secondary">Unauthorized</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">Recent Alerts</p>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {alerts.slice(0, 5).map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs p-2 rounded bg-bg-secondary"
              >
                <AlertTriangle
                  size={12}
                  className={`mt-0.5 ${
                    alert.metadata?.severity === 'CRITICAL' || alert.metadata?.severity === 'HIGH'
                      ? 'text-status-danger'
                      : 'text-status-warning'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary">{alert.action}</p>
                  <p className="text-text-tertiary text-[10px]">
                    {alert.actorId?.name || 'System'} • {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getSeverityColor(
                    alert.metadata?.severity
                  )}`}
                >
                  {alert.metadata?.severity || 'LOW'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityWidget;