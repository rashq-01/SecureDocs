import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import CaseList from '../components/cases/CaseList';
import CaseCreate from '../components/cases/CaseCreate';
import RoleGate from '../components/common/RoleGate';
import { Plus } from 'lucide-react';

const Cases = () => {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateSuccess = () => {
    setShowCreate(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Cases</h1>
        <RoleGate roles={['Admin']}>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Create Case
          </button>
        </RoleGate>
      </div>

      {showCreate && (
        <div className="mb-6">
          <CaseCreate onSuccess={handleCreateSuccess} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <CaseList key={refreshTrigger} />
    </div>
  );
};

export default Cases;