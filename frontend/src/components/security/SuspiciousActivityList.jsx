import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getSuspiciousActivities } from '../../services/security.api';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { formatDate, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const SuspiciousActivityList = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    skip: 0,
    total: 0,
  });

  useEffect(() => {
    fetchActivities();
  }, [filters.severity, pagination.skip]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await getSuspiciousActivities({
        severity: filters.severity,
        limit: pagination.limit,
        skip: pagination.skip,
      });
      setActivities(response.data.data?.activities || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.data?.total || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch suspicious activities:', error);
      toast.error('Failed to load suspicious activities');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: 'badge-danger',
      HIGH: 'badge-danger',
      MEDIUM: 'badge-warning',
      LOW: 'badge-neutral',
    };
    return colors[severity] || 'badge-neutral';
  };

  const getSeverityLabel = (severity) => {
    const labels = {
      CRITICAL: 'Critical',
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
    };
    return labels[severity] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-md font-medium">Suspicious Activities</h2>
        <button onClick={fetchActivities} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && fetchActivities()}
              className="input-field pl-9"
            />
          </div>
        </div>
        <select
          value={filters.severity}
          onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
          className="input-field w-40"
        >
          <option value="">All Severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {activities.length === 0 ? (
        <div className="card text-center py-12">
          <AlertTriangle size={48} className="mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary">No suspicious activities found</p>
        </div>
      ) : (
        <>
          <div className="bg-bg-primary border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Timestamp</th>
                    <th className="table-header">Rule</th>
                    <th className="table-header">User</th>
                    <th className="table-header">Severity</th>
                    <th className="table-header">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity._id} className="hover:bg-bg-tertiary">
                      <td className="table-cell text-xs text-text-secondary whitespace-nowrap">
                        {timeAgo(activity.timestamp)}
                      </td>
                      <td className="table-cell">
                        <span className="text-xs font-mono">
                          {activity.metadata?.rule || 'Unknown'}
                        </span>
                      </td>
                      <td className="table-cell text-sm">
                        {activity.actorId?.name || 'System'}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getSeverityColor(activity.metadata?.severity)}`}>
                          {getSeverityLabel(activity.metadata?.severity)}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-text-secondary">
                        {activity.metadata?.details ? (
                          <details>
                            <summary className="cursor-pointer text-accent">View</summary>
                            <pre className="mt-1 p-2 bg-bg-secondary rounded text-xs overflow-x-auto">
                              {JSON.stringify(activity.metadata.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
              <span>Showing {activities.length} of {pagination.total} entries</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
                  disabled={pagination.skip === 0}
                  className="btn-secondary text-xs px-3 py-1"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
                  disabled={pagination.skip + pagination.limit >= pagination.total}
                  className="btn-secondary text-xs px-3 py-1"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SuspiciousActivityList;