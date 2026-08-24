import React, { useState, useEffect } from 'react';
import * as caseApi from '../../services/case.api';
import { formatDate, timeAgo } from '../../utils/helpers';
import { Activity, User, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const CaseActivity = ({ caseId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [caseId]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await caseApi.getCaseActivities(caseId);
      setActivities(response.data.data?.activities || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action) => {
    const icons = {
      Created: Activity,
      Updated: Activity,
      StatusChanged: Activity,
      MemberAdded: User,
      MemberRemoved: User,
      DocumentUploaded: FileText,
      DocumentDeleted: FileText,
      DocumentArchived: FileText,
      DocumentRestored: FileText,
      PriorityChanged: Activity,
      TagAdded: Activity,
      TagRemoved: Activity,
    };
    const Icon = icons[action] || Activity;
    return <Icon size={14} />;
  };

  const getActivityColor = (action) => {
    const colors = {
      Created: 'text-status-success',
      Updated: 'text-status-info',
      StatusChanged: 'text-status-warning',
      MemberAdded: 'text-status-success',
      MemberRemoved: 'text-status-danger',
      DocumentUploaded: 'text-status-info',
      DocumentDeleted: 'text-status-danger',
      DocumentArchived: 'text-status-neutral',
      DocumentRestored: 'text-status-success',
      PriorityChanged: 'text-status-warning',
      TagAdded: 'text-status-info',
      TagRemoved: 'text-status-neutral',
    };
    return colors[action] || 'text-text-secondary';
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading activities...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="card text-center py-8">
        <Activity size={32} className="mx-auto text-text-tertiary mb-2" />
        <p className="text-text-secondary">No activities recorded</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium">Case Activity</h3>
        <button onClick={fetchActivities} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity._id} className="flex items-start gap-3 p-2 border-b border-border last:border-0">
            <div className={`mt-0.5 flex-shrink-0 ${getActivityColor(activity.action)}`}>
              {getActivityIcon(activity.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.actorId?.name || 'System'}</span>
                <span className="text-text-secondary"> {activity.action}</span>
                {activity.details && Object.keys(activity.details).length > 0 && (
                  <span className="text-xs text-text-secondary ml-1">
                    ({JSON.stringify(activity.details).replace(/[{}"]/g, '').replace(/:/g, ': ')})
                  </span>
                )}
              </p>
              <p className="text-xs text-text-tertiary">{timeAgo(activity.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CaseActivity;