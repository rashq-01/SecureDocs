import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as documentApi from '../services/document.api';
import DocumentDetail from '../components/documents/DocumentDetail';
import DocumentVersionHistory from '../components/documents/DocumentVersionHistory';
import DocumentPermissions from '../components/documents/DocumentPermissions';
import DocumentShare from '../components/documents/DocumentShare';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const DocumentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const response = await documentApi.getDocument(id);
      setDocument(response.data.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      toast.error('Failed to load document');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    // Cleanup object URL on unmount or when previewUrl changes
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDownload = async () => {
    try {
      const response = await documentApi.downloadDocument(id);
      
      const blob = new Blob([response.data]);
      
      let filename = document?.originalFileName || 'document.pdf';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      window.document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const handlePreview = async () => {
    try {
      const response = await documentApi.previewDocument(id);
      const contentType = response.headers['content-type'] || 'application/pdf';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      toast.success('Preview loaded');
    } catch (error) {
      toast.error('Failed to load preview');
    }
  };

  const handleVerifySignature = async () => {
    try {
      const response = await documentApi.verifySignature(id);
      const data = response.data.data;
      if (data.isValid) {
        toast.success(`Signature valid! Approved by ${data.approvedBy.name} on ${new Date(data.approvedAt).toLocaleDateString()}`);
      } else {
        toast.error('Signature validation failed!');
      }
    } catch (error) {
      toast.error('Failed to verify signature');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await documentApi.updateDocumentStatus(id, newStatus);
      toast.success(`Document status updated to ${newStatus}`);
      fetchDocument();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update document status');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Document not found</p>
      </div>
    );
  }

  const canManage = user?.role === 'Admin' || user?.role === 'Reviewer';

  return (
    <div>
      <button
        onClick={() => navigate('/documents')}
        className="btn-secondary flex items-center gap-2 mb-4"
      >
        <ArrowLeft size={16} /> Back to Documents
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">
          {document.title}
        </h1>
        <p className="text-sm text-text-secondary">
          {document.documentType} • v{document.currentVersion || 1}
        </p>
      </div>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-4 flex-wrap">
          <button
            onClick={() => setActiveTab('details')}
            className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`tab ${activeTab === 'versions' ? 'tab-active' : ''}`}
          >
            Versions
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`tab ${activeTab === 'permissions' ? 'tab-active' : ''}`}
            >
              Permissions
            </button>
          )}
          <button
            onClick={() => setActiveTab('share')}
            className={`tab ${activeTab === 'share' ? 'tab-active' : ''}`}
          >
            Share
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'details' && (
          <DocumentDetail 
            document={document} 
            onDownload={handleDownload} 
            onPreview={handlePreview}
            previewUrl={previewUrl}
            onVerifySignature={handleVerifySignature}
            onStatusChange={handleStatusChange}
          />
        )}
        {activeTab === 'versions' && (
          <DocumentVersionHistory documentId={document._id} />
        )}
        {activeTab === 'permissions' && canManage && (
          <DocumentPermissions documentId={document._id} />
        )}
        {activeTab === 'share' && (
          <DocumentShare documentId={document._id} document={document} />
        )}
      </div>
    </div>
  );
};

export default DocumentDetailPage;