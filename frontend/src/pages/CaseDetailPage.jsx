import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as caseApi from '../services/case.api';
import CaseDetail from '../components/cases/CaseDetail';
import CaseActivity from '../components/cases/CaseActivity';
import CaseMembers from '../components/cases/CaseMembers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const CaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (id) {
      console.log('=== CASE DETAIL PAGE ===');
      console.log('ID from URL:', id);
      console.log('ID length:', id?.length);
      fetchCase();
    } else {
      setError('No case ID provided');
      setLoading(false);
    }
  }, [id]);

  const fetchCase = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching case with ID:', id);
      
      // Validate ID format (MongoDB ObjectId is 24 hex characters)
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
        console.error('Invalid ID format:', id);
        setError('Invalid case ID format');
        setLoading(false);
        return;
      }
      
      const response = await caseApi.getCase(id);
      console.log('Case API response:', response.data);
      
      let caseData = response.data?.data;
      if (!caseData) {
        caseData = response.data;
      }
      
      if (!caseData || Object.keys(caseData).length === 0) {
        setError('Case not found');
        setLoading(false);
        return;
      }
      
      console.log('Case data loaded:', caseData);
      setCaseData(caseData);
    } catch (error) {
      console.error('Failed to fetch case:', error);

      const status = error.response?.status;

      // A 404 (or 400 invalid-id) here almost always means the id is stale — the case
      // was removed or its _id changed because the DB was re-seeded/reset. Instead of
      // stranding the user on an error screen, send them back to the case list, which
      // reloads fresh ids on mount.
      if (status === 404 || status === 400) {
        toast.error('That case is no longer available — it may have been removed. Showing the latest cases.');
        navigate('/cases', { replace: true });
        return;
      }

      let errorMessage = 'Failed to load case';
      if (status === 403) {
        errorMessage = 'You do not have permission to view this case.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchCase();
  };

  const handleBack = () => {
    navigate('/cases');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <AlertCircle size={48} className="mx-auto text-status-danger mb-4" />
        <h2 className="text-lg font-semibold mb-2">Error Loading Case</h2>
        <p className="text-text-secondary">{error}</p>
        <div className="mt-4 flex gap-3 justify-center">
          <button onClick={handleRetry} className="btn-primary flex items-center gap-2">
            <RefreshCw size={16} /> Retry
          </button>
          <button onClick={handleBack} className="btn-secondary">
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="card text-center py-12">
        <p className="text-text-secondary">Case not found</p>
        <button onClick={handleBack} className="btn-primary mt-4">
          Back to Cases
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={handleBack} className="btn-secondary flex items-center gap-2 mb-4">
        <ArrowLeft size={16} /> Back to Cases
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">
          {caseData.title}
        </h1>
        <p className="text-sm text-text-secondary">
          Case ID: {caseData.caseId}
        </p>
        <p className="text-xs text-text-tertiary">
          Document ID: {caseData._id}
        </p>
      </div>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`tab ${activeTab === 'members' ? 'tab-active' : ''}`}
          >
            Members ({caseData.assignedOfficers?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`tab ${activeTab === 'activities' ? 'tab-active' : ''}`}
          >
            Activities
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'details' && (
          <CaseDetail caseData={caseData} onUpdate={fetchCase} />
        )}
        {activeTab === 'members' && (
          <CaseMembers caseData={caseData} onUpdate={fetchCase} />
        )}
        {activeTab === 'activities' && (
          <CaseActivity caseId={caseData._id} />
        )}
      </div>
    </div>
  );
};

export default CaseDetailPage;