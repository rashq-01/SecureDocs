import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as documentApi from '../../services/document.api';
import { formatDate, formatFileSize } from '../../utils/helpers';
import { Download, FileText, RefreshCw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const DocumentVersionHistory = ({ documentId }) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading versions...</div>;
  }

  if (versions.length === 0) {
    return (
      <div className="card text-center py-8">
        <FileText size={32} className="mx-auto text-text-tertiary mb-2" />
        <p className="text-text-secondary">No versions available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium">Version History</h3>
        <button onClick={fetchVersions} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

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
            <button
              onClick={() => handleDownloadVersion(version.version)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download size={14} /> Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentVersionHistory;