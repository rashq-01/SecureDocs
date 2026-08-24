import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import TamperAlertBadge from './TamperAlertBadge';
import RoleGate from '../common/RoleGate';
import { formatDate, formatFileSize } from '../../utils/helpers';
import { Download, RefreshCw, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const DocumentDetail = ({ document, onDownload }) => {
  const { user } = useAuth();

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      toast.error('Download not available');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Draft: 'badge-neutral',
      UnderReview: 'badge-warning',
      Approved: 'badge-success',
      Rejected: 'badge-danger',
      Archived: 'badge-neutral',
    };
    return badges[status] || 'badge-neutral';
  };

  const canReview = ['Reviewer', 'Admin'].includes(user?.role);
  const canStatusChange = canReview && ['Draft', 'UnderReview'].includes(document?.status);

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-3">
            {document.title}
            {document.tamperFlag && <TamperAlertBadge />}
          </h2>
          <p className="text-sm text-text-secondary">
            Case: {document.caseId?.caseId || document.caseId || '—'}
          </p>
        </div>
        <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
          <Download size={16} /> Download
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-4">
        <div>
          <span className="text-text-secondary">Document Type:</span>{' '}
          {document.documentType || '—'}
        </div>
        <div>
          <span className="text-text-secondary">Classification:</span>{' '}
          <span className={`badge ${
            document.classificationLevel === 'Restricted' ? 'badge-danger' :
            document.classificationLevel === 'Confidential' ? 'badge-warning' :
            'badge-neutral'
          }`}>
            {document.classificationLevel || 'General'}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">Status:</span>{' '}
          <span className={`badge ml-1 ${getStatusBadge(document.status)}`}>
            {document.status || 'Draft'}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">Uploaded:</span>{' '}
          {formatDate(document.createdAt)}
        </div>
        <div className="col-span-2">
          <span className="text-text-secondary">File Hash:</span>{' '}
          <span className="font-mono text-xs break-all">{document.fileHash || '—'}</span>
        </div>
        <div>
          <span className="text-text-secondary">Size:</span>{' '}
          {formatFileSize(document.fileSize)}
        </div>
        <div>
          <span className="text-text-secondary">Version:</span>{' '}
          v{document.currentVersion || 1}
        </div>
        {document.uploadedBy && (
          <div className="col-span-2">
            <span className="text-text-secondary">Uploaded By:</span>{' '}
            {document.uploadedBy.name || 'Unknown'} ({document.uploadedBy.email || 'Unknown email'})
          </div>
        )}
      </div>

      {canStatusChange && (
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-sm font-medium mb-3">Update Status</p>
          <div className="flex gap-3">
            {document.status === 'Draft' && (
              <button className="btn-primary flex items-center gap-2">
                <RefreshCw size={16} /> Submit for Review
              </button>
            )}
            {document.status === 'UnderReview' && (
              <>
                <button className="bg-status-success text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 flex items-center gap-2">
                  <Check size={16} /> Approve
                </button>
                <button className="bg-status-danger text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 flex items-center gap-2">
                  <X size={16} /> Reject
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetail;