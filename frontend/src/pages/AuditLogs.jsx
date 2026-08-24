import React from 'react';
import AuditLogTable from '../components/audit/AuditLogTable';
import RoleGate from '../components/common/RoleGate';
import { useAuth } from '../hooks/useAuth';

const AuditLogs = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Audit Logs</h1>

      <RoleGate roles={['Admin', 'Auditor']}>
        <AuditLogTable />
      </RoleGate>

      <RoleGate roles={['Admin', 'Auditor']} invert>
        <div className="card text-center py-12">
          <p className="text-text-secondary text-sm">
            Access restricted to Admin and Auditor roles
          </p>
        </div>
      </RoleGate>
    </div>
  );
};

export default AuditLogs;