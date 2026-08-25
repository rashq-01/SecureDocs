import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DocumentList from '../components/documents/DocumentList';
import DocumentUpload from '../components/documents/DocumentUpload';
import RoleGate from '../components/common/RoleGate';
import { Plus } from 'lucide-react';

const Documents = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('upload') === 'true') {
      setShowUpload(true);
      // Clean up URL
      navigate('/documents', { replace: true });
    }
  }, [location, navigate]);

  const handleUploadSuccess = () => {
    setShowUpload(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Documents</h1>
        <RoleGate roles={['Admin', 'IO']}>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Upload Document
          </button>
        </RoleGate>
      </div>

      {showUpload && (
        <div className="mb-6">
          <DocumentUpload onSuccess={handleUploadSuccess} onCancel={() => setShowUpload(false)} />
        </div>
      )}

      <DocumentList key={refreshTrigger} />
    </div>
  );
};

export default Documents;