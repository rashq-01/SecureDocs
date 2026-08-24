import React from 'react';
import ActivityFeed from './ActivityFeed';
import { FileCheck, Scale } from 'lucide-react';

const LegalLiaisonDashboard = () => {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Legal Liaison Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-status-successBg text-status-success">
              <FileCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Approved Documents</p>
              <p className="text-xl font-semibold">0</p>
              <p className="text-xs text-text-tertiary">Available for court submission</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-accent-subtle text-accent">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Legal Status</p>
              <p className="text-sm text-text-secondary">No pending legal actions</p>
            </div>
          </div>
        </div>
      </div>

      <ActivityFeed title="Recent Activity" />
    </div>
  );
};

export default LegalLiaisonDashboard;