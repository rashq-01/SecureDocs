import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import TamperAlertBadge from './TamperAlertBadge';
import RoleGate from '../common/RoleGate';
import { formatDate, formatFileSize } from '../../utils/helpers';
import { Download, RefreshCw, Check, X, Eye, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const DocumentDetail = ({ document, onDownload, onPreview, previewUrl, onVerifySignature, onStatusChange }) => {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = React.useState(false);

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
          <h2 className="text-lg font-semibold flex flex-wrap items-center gap-3">
            {document.title}
            {document.tamperFlag && <TamperAlertBadge />}
            {document.status === 'Approved' && document.approvalSignature && (
              <button 
                onClick={() => {
                  setIsVerifying(true);
                  setTimeout(() => {
                    setIsVerifying(false);
                    onVerifySignature();
                  }, 600);
                }}
                className={`relative overflow-hidden group flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300 ${
                  isVerifying 
                    ? 'bg-status-successBg border-status-success text-status-success'
                    : 'bg-bg-surface backdrop-blur-md border-accent/30 text-accent hover:border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]'
                }`}
                title="Click to verify digital signature"
                disabled={isVerifying}
              >
                {/* Glow effect behind */}
                <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                <div className="relative z-10 flex items-center gap-1.5">
                  {isVerifying ? (
                    <Check size={14} className="animate-spatial" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  <span>{isVerifying ? 'Verified' : 'Digitally Signed'}</span>
                </div>
              </button>
            )}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Case: {document.caseId?.caseId || document.caseId || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPreview} className="btn-secondary flex items-center gap-2">
            <Eye size={16} /> Preview
          </button>
          <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {previewUrl && (
        <div className="mb-6 border border-border rounded overflow-hidden" style={{ height: '500px' }}>
          <iframe 
            src={previewUrl} 
            title="Document Preview" 
            className="w-full h-full bg-white"
            frameBorder="0"
          />
        </div>
      )}

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
              <button 
                onClick={() => onStatusChange('UnderReview')}
                className="btn-primary flex items-center gap-2"
              >
                <RefreshCw size={16} /> Submit for Review
              </button>
            )}
            {document.status === 'UnderReview' && (
              <>
                <button 
                  onClick={() => onStatusChange('Approved')}
                  className="bg-status-success text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <Check size={16} /> Approve
                </button>
                <button 
                  onClick={() => onStatusChange('Rejected')}
                  className="bg-status-danger text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                >
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