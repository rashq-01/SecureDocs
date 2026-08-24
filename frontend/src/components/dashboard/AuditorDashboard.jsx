import React from 'react';
import { Link } from 'react-router-dom';
import ActivityFeed from './ActivityFeed';
import { ClipboardList, FileSearch } from 'lucide-react';

const AuditorDashboard = () => {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Auditor Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link to="/audit-logs" className="card hover:border-accent transition-colors block">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-accent-subtle text-accent">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Audit Trail</p>
              <p className="text-sm font-medium text-accent">View full audit logs →</p>
            </div>
          </div>
        </Link>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-accent-subtle text-accent">
              <FileSearch size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Document Access</p>
              <p className="text-sm text-text-secondary">Metadata only — content restricted</p>
            </div>
          </div>
        </div>
      </div>

      <ActivityFeed title="System Activity" />
    </div>
  );
};

export default AuditorDashboard;