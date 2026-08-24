import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getDetectionRules } from '../../services/security.api';
import { Shield, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const DetectionRules = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedRule, setExpandedRule] = useState(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await getDetectionRules();
      setRules(response.data.data || {});
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      toast.error('Failed to load detection rules');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: 'text-status-danger bg-status-dangerBg',
      HIGH: 'text-status-danger bg-status-dangerBg',
      MEDIUM: 'text-status-warning bg-status-warningBg',
      LOW: 'text-status-neutral bg-status-neutralBg',
    };
    return colors[severity] || 'text-status-neutral bg-status-neutralBg';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return <AlertTriangle size={16} className="text-status-danger" />;
    }
    if (severity === 'MEDIUM') {
      return <AlertTriangle size={16} className="text-status-warning" />;
    }
    return <CheckCircle size={16} className="text-status-success" />;
  };

  const toggleExpand = (ruleName) => {
    setExpandedRule(expandedRule === ruleName ? null : ruleName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (Object.keys(rules).length === 0) {
    return (
      <div className="card text-center py-12">
        <Shield size={48} className="mx-auto text-text-tertiary mb-4" />
        <p className="text-text-secondary">No detection rules configured</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-md font-medium">Detection Rules</h2>
        <button onClick={fetchRules} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(rules).map(([ruleName, ruleConfig]) => (
          <div key={ruleName} className="card">
            <div 
              className="flex items-start justify-between cursor-pointer"
              onClick={() => toggleExpand(ruleName)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded ${getSeverityColor(ruleConfig.severity)}`}>
                  {getSeverityIcon(ruleConfig.severity)}
                </div>
                <div>
                  <p className="font-medium text-sm">{ruleName.replace(/_/g, ' ')}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-secondary">
                      Status: {ruleConfig.enabled ? (
                        <span className="text-status-success">Enabled</span>
                      ) : (
                        <span className="text-status-danger">Disabled</span>
                      )}
                    </span>
                    <span className={`text-xs ${getSeverityColor(ruleConfig.severity)}`}>
                      {ruleConfig.severity}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-text-tertiary text-sm">
                {expandedRule === ruleName ? '▲' : '▼'}
              </span>
            </div>

            {expandedRule === ruleName && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(ruleConfig).map(([key, value]) => {
                    if (key === 'enabled' || key === 'severity' || key === 'action') return null;
                    return (
                      <div key={key}>
                        <span className="text-text-secondary">{key}:</span>{' '}
                        <span className="font-mono text-xs">{String(value)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-text-secondary">
                    Action: <span className="font-medium">{ruleConfig.action || 'SUSPICIOUS_ACTIVITY'}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetectionRules;