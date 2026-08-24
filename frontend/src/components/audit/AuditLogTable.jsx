import React, { useState, useEffect } from 'react';
import * as auditApi from '../../services/audit.api';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const AuditLogTable = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    actorId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await auditApi.getAuditLogs(filters);
      console.log('Audit logs response:', response.data);
      setLogs(response.data.data?.logs || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const toastId = toast.loading(`Generating ${format.toUpperCase()} report...`);
      const response = await auditApi.exportAuditLogs({ ...filters, format });
      
      const blob = new Blob([response.data]);
      let filename = `Compliance_Report_${new Date().toISOString().split('T')[0]}.${format}`;
      
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename=([^;]+)/.exec(disposition);
        if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
      }

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Report downloaded successfully', { id: toastId });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const getActionColor = (action) => {
    const colors = {
      Upload: 'text-status-info',
      View: 'text-text-secondary',
      Download: 'text-text-secondary',
      StatusChange: 'text-status-warning',
      Login: 'text-status-success',
      LoginFailed: 'text-status-danger',
      TamperDetected: 'text-status-danger',
      PermissionChange: 'text-status-warning',
    };
    return colors[action] || 'text-text-secondary';
  };

  // Safely get actor name
  const getActorName = (log) => {
    if (!log.actorId) return 'Unknown';
    if (typeof log.actorId === 'string') return 'User';
    if (typeof log.actorId === 'object' && log.actorId.name) {
      return log.actorId.name;
    }
    return 'Unknown';
  };

  // Safely get document title
  const getDocumentTitle = (log) => {
    if (!log.targetDocumentId) return '—';
    if (typeof log.targetDocumentId === 'string') return 'Document';
    if (typeof log.targetDocumentId === 'object' && log.targetDocumentId.title) {
      return log.targetDocumentId.title;
    }
    return '—';
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading audit logs...</div>;
  }

  return (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by actor..."
              value={filters.actorId}
              onChange={(e) => setFilters(prev => ({ ...prev, actorId: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="input-field pl-9"
            />
          </div>
        </div>
        <select
          value={filters.action}
          onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          className="input-field w-40"
        >
          <option value="">All Actions</option>
          <option value="Upload">Upload</option>
          <option value="View">View</option>
          <option value="Download">Download</option>
          <option value="StatusChange">Status Change</option>
          <option value="Login">Login</option>
          <option value="LoginFailed">Login Failed</option>
          <option value="TamperDetected">Tamper Detected</option>
          <option value="PermissionChange">Permission Change</option>
        </select>
        <button onClick={fetchLogs} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
        <button 
          onClick={() => handleExport('pdf')} 
          className="bg-accent text-white px-3 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors flex items-center gap-2 ml-auto"
        >
          Export PDF
        </button>
        <button 
          onClick={() => handleExport('csv')} 
          className="bg-bg-tertiary text-text-primary px-3 py-2 rounded text-sm font-medium hover:bg-border transition-colors flex items-center gap-2"
        >
          Export CSV
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-bg-primary border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Timestamp</th>
                  <th className="table-header">Actor</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Document</th>
                  <th className="table-header">Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-bg-tertiary">
                    <td className="table-cell text-xs text-text-secondary whitespace-nowrap">
                      {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : '—'}
                    </td>
                    <td className="table-cell text-sm">{getActorName(log)}</td>
                    <td className="table-cell">
                      <span className={getActionColor(log.action)}>{log.action}</span>
                    </td>
                    <td className="table-cell text-sm font-mono text-xs">
                      {getDocumentTitle(log)}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${log.result === 'Success' ? 'badge-success' : 'badge-danger'}`}>
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border text-xs text-text-tertiary">
            Showing {logs.length} entries
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogTable;