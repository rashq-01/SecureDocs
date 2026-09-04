import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as documentApi from '../../services/document.api';
import { formatDate, formatFileSize } from '../../utils/helpers';
import { Download, FileText, RefreshCw, Clock, Upload, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Modern react-pdf v9+ requires the .mjs worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentVersionHistory = ({ documentId, onVersionCreated }) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [changelog, setChangelog] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewVersionNumber, setPreviewVersionNumber] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageError, setImageError] = useState(false);
  const containerRef = React.useRef(null);
  const isDragging = React.useRef(false);
  const startPos = React.useRef({ x: 0, y: 0 });
  const scrollPos = React.useRef({ left: 0, top: 0 });

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    startPos.current = {
      x: e.clientX - containerRef.current.offsetLeft,
      y: e.clientY - containerRef.current.offsetTop,
    };
    scrollPos.current = {
      left: containerRef.current.scrollLeft,
      top: containerRef.current.scrollTop,
    };
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || imageZoom <= 1) return;
    e.preventDefault();
    const x = e.clientX - containerRef.current.offsetLeft;
    const y = e.clientY - containerRef.current.offsetTop;
    const walkX = (x - startPos.current.x) * 1.5;
    const walkY = (y - startPos.current.y) * 1.5;
    containerRef.current.scrollLeft = scrollPos.current.left - walkX;
    containerRef.current.scrollTop = scrollPos.current.top - walkY;
  };

  useEffect(() => {
    fetchVersions();
  }, [documentId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await documentApi.getDocumentVersions(documentId);
      setVersions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVersion = async (versionNumber) => {
    try {
      const response = await documentApi.downloadVersion(documentId, versionNumber);
      
      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `version-${versionNumber}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Version ${versionNumber} downloaded`);
    } catch (error) {
      console.error('Failed to download version:', error);
      toast.error('Failed to download version');
    }
  };

  const handlePreviewVersion = async (versionNumber) => {
    try {
      const response = await documentApi.previewVersion(documentId, versionNumber);
      const contentType = response.headers['content-type'] || 'application/pdf';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewVersionNumber(versionNumber);
      toast.success(`Preview loaded for version ${versionNumber}`);
    } catch (error) {
      console.error('Failed to load version preview:', error);
      toast.error('Failed to load version preview');
    }
  };

  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (changelog) formData.append('changelog', changelog);

    try {
      await documentApi.createVersion(documentId, formData);
      toast.success('New version uploaded successfully!');
      setSelectedFile(null);
      setChangelog('');
      fetchVersions();
      if (onVersionCreated) onVersionCreated();
    } catch (error) {
      console.error('Failed to upload version:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to upload new version');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading versions...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium">Version History</h3>
        <button onClick={fetchVersions} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {(user.role === 'Admin' || user.role === 'IO') && (
        <form onSubmit={handleUploadVersion} className="mb-6 bg-bg-secondary p-4 rounded border border-border">
          <h4 className="text-sm font-medium mb-3">Upload New Version</h4>
          <div className="space-y-3">
            <div>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-accent-subtle file:text-accent hover:file:bg-accent hover:file:text-white transition-colors"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Changelog (e.g. 'Updated section 3 to include new forensic evidence')"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="bg-accent text-white px-3 py-2 rounded text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Upload size={14} />
              {isUploading ? 'Uploading...' : 'Upload Version'}
            </button>
          </div>
        </form>
      )}

      {previewUrl && (() => {
        const currentPreviewVersion = versions.find(v => v.version === previewVersionNumber);
        const isPdf = currentPreviewVersion?.originalFileName?.toLowerCase().endsWith('.pdf');
        
        return (
          <div 
            ref={containerRef}
            className="mb-6 border border-border rounded overflow-auto bg-[#0f172a] select-none relative" 
            style={{ height: '500px' }} 
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="sticky top-0 left-0 right-0 bg-[#0f172a]/90 backdrop-blur-sm p-2 flex justify-between items-center border-b border-border z-10">
              <span className="text-sm font-medium text-white">Previewing Version {previewVersionNumber}</span>
              <div className="flex gap-2">
                <button onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.2))} className="text-white hover:text-accent p-1">-</button>
                <button onClick={() => setImageZoom(1)} className="text-white hover:text-accent p-1 text-xs">Reset</button>
                <button onClick={() => setImageZoom(prev => Math.min(3, prev + 0.2))} className="text-white hover:text-accent p-1">+</button>
                <div className="w-px h-4 bg-border my-auto mx-1" />
                <button 
                  onClick={() => { setPreviewUrl(null); setPreviewVersionNumber(null); setImageZoom(1); }}
                  className="text-sm text-status-warning hover:text-status-warning/80"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {isPdf ? (
              <div className="min-w-min min-h-full flex flex-col p-4 pt-12">
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
                className="w-full min-h-full flex items-center justify-center p-4 pt-12" 
                style={{ cursor: imageZoom > 1 ? 'grab' : 'default' }}
              >
                <div 
                  style={{
                    transform: `scale(${imageZoom})`,
                    transformOrigin: imageZoom > 1 ? 'top left' : 'center center',
                    transition: 'transform 0.15s ease-out'
                  }}
                  className="flex items-center justify-center h-full w-full"
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
                     className="w-full h-full bg-white select-none pointer-events-none absolute inset-0 mt-12"
                     frameBorder="0"
                   />
                )}
              </div>
            )}
          </div>
        );
      })()}

      {versions.length === 0 ? (
        <div className="card text-center py-8">
          <FileText size={32} className="mx-auto text-text-tertiary mb-2" />
          <p className="text-text-secondary">No versions available</p>
        </div>
      ) : (
        <div className="space-y-3">
        {versions.map((version, index) => (
          <div key={version._id} className="flex items-center justify-between p-3 bg-bg-secondary rounded">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-medium text-sm">
                v{version.version}
              </div>
              <div>
                <p className="text-sm font-medium">
                  Version {version.version}
                  {index === 0 && (
                    <span className="ml-2 text-xs text-status-success bg-status-successBg px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{formatFileSize(version.fileSize)}</span>
                  <span>•</span>
                  <span>{version.uploadedBy?.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{formatDate(version.createdAt)}</span>
                </div>
                {version.changelog && (
                  <p className="text-xs text-text-secondary mt-1 italic">"{version.changelog}"</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePreviewVersion(version.version)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Eye size={14} /> Preview
              </button>
              <button
                onClick={() => handleDownloadVersion(version.version)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download size={14} /> Download
              </button>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default DocumentVersionHistory;