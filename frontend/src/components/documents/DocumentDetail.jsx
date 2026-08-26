import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import TamperAlertBadge from './TamperAlertBadge';
import RoleGate from '../common/RoleGate';
import { formatDate, formatFileSize } from '../../utils/helpers';
import { Download, RefreshCw, Check, X, Eye, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Modern react-pdf v9+ requires the .mjs worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentDetail = ({ document, onPreview, onClosePreview, previewUrl, onVerifySignature, onStatusChange }) => {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [numPages, setNumPages] = React.useState(null);
  const [imageZoom, setImageZoom] = React.useState(1);
  const [imageError, setImageError] = React.useState(false);
  const containerRef = React.useRef(null);
  const isDragging = React.useRef(false);
  const startPos = React.useRef({ x: 0, y: 0 });
  const scrollPos = React.useRef({ left: 0, top: 0 });

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };
  
  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.5, 0.5));

  const handleMouseDown = (e) => {
    if (!containerRef.current || imageZoom <= 1) return;
    isDragging.current = true;
    startPos.current = { x: e.pageX, y: e.pageY };
    scrollPos.current = { 
      left: containerRef.current.scrollLeft, 
      top: containerRef.current.scrollTop 
    };
    containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const dx = e.pageX - startPos.current.x;
    const dy = e.pageY - startPos.current.y;
    containerRef.current.scrollLeft = scrollPos.current.left - dx;
    containerRef.current.scrollTop = scrollPos.current.top - dy;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = imageZoom > 1 ? 'grab' : 'default';
    }
  };

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setImageZoom(prev => Math.min(prev + 0.15, 5)); // Zoom in
        } else {
          setImageZoom(prev => Math.max(prev - 0.15, 0.5)); // Zoom out
        }
      }
    };
    
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [previewUrl]);

  // Download removed as per strict security policy

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
    <div 
      className="card select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
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
          {previewUrl && (
            <div className="flex bg-bg-surface border border-border rounded items-center overflow-hidden mr-2">
              <button onClick={handleZoomOut} className="px-2 py-1 hover:bg-bg-tertiary transition-colors text-text-secondary" title="Zoom Out">-</button>
              <span className="px-2 py-1 text-xs text-text-secondary border-x border-border font-mono">{Math.round(imageZoom * 100)}%</span>
              <button onClick={handleZoomIn} className="px-2 py-1 hover:bg-bg-tertiary transition-colors text-text-secondary" title="Zoom In">+</button>
            </div>
          )}
          {previewUrl ? (
            <button onClick={onClosePreview} className="btn-secondary flex items-center gap-2 text-status-warning hover:text-status-warning/80 hover:border-status-warning/50">
              <X size={16} /> Close Preview
            </button>
          ) : (
            <button onClick={onPreview} className="btn-secondary flex items-center gap-2">
              <Eye size={16} /> Preview
            </button>
          )}
        </div>
      </div>

      {previewUrl && (
        <div 
          ref={containerRef}
          className="mb-6 border border-border rounded overflow-auto bg-[#0f172a] select-none relative" 
          style={{ height: '600px' }} 
          onContextMenu={(e) => e.preventDefault()}
        >
          {document.originalFileName?.toLowerCase().endsWith('.pdf') ? (
            <div className="min-w-min min-h-full flex flex-col p-4">
              <Document
                file={previewUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error) => console.error('Error loading PDF:', error)}
                loading={<div className="text-text-secondary w-full text-center mt-10">Loading secure PDF view...</div>}
                className="mx-auto"
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page 
                    key={`page_${index + 1}`} 
                    pageNumber={index + 1} 
                    scale={imageZoom * 1.2} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false}
                    className="mb-4 shadow-lg bg-white"
                  />
                ))}
              </Document>
            </div>
          ) : (
            <div 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="w-full min-h-full flex items-center justify-center p-4" 
              style={{ cursor: imageZoom > 1 ? 'grab' : 'default' }}
            >
              <div 
                style={{
                  transform: `scale(${imageZoom})`,
                  transformOrigin: imageZoom > 1 ? 'top left' : 'center center',
                  transition: 'transform 0.15s ease-out'
                }}
                className="flex items-center justify-center"
              >
                <img 
                  src={previewUrl} 
                  alt="Document Preview" 
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                  className="select-none shadow-xl rounded pointer-events-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onError={(e) => {
                    if(!imageError) {
                      setImageError(true);
                      e.target.style.display = 'none';
                    }
                  }}
                />
              </div>
              {imageError && (
                 <iframe 
                   src={previewUrl} 
                   title="Document Preview Fallback" 
                   className="w-full h-full bg-white select-none pointer-events-none absolute inset-0"
                   frameBorder="0"
                 />
              )}
            </div>
          )}
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

      {document.aiSummary && (
        <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-semibold text-accent">AI-Generated Analysis</h3>
          </div>
          <p className="text-sm text-text-primary mb-3 leading-relaxed">
            {document.aiSummary}
          </p>
          {document.aiSuggestedType && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary">Suggested Classification:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                document.aiSuggestedType !== document.documentType 
                  ? 'bg-status-warningBg text-status-warning border border-status-warning/30' 
                  : 'bg-accent/10 text-accent border border-accent/20'
              }`}>
                {document.aiSuggestedType}
              </span>
              {document.aiSuggestedType !== document.documentType && (
                <span className="text-xs text-text-tertiary italic">(Differs from manual selection)</span>
              )}
            </div>
          )}
        </div>
      )}

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