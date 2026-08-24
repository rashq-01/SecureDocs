import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accessShare } from '../services/document.api';
import toast from 'react-hot-toast';

const ShareAccess = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processShare = async () => {
      try {
        const response = await accessShare(token);
        // On success, redirect to the document detail page
        toast.success('Successfully accessed shared document!');
        navigate(`/documents/${response.data.data.documentId}`);
      } catch (err) {
        console.error('Failed to access share:', err);
        const errMsg = err.response?.data?.error?.message || 'Failed to access shared document. It may have expired or been revoked.';
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      processShare();
    }
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-bg-tertiary border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-text-secondary">Verifying share link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4">
        <div className="w-16 h-16 bg-status-danger/10 text-status-danger rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-text-secondary mb-6">{error}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-primary w-full"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return null;
};

export default ShareAccess;
