import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ActivityFeed from './ActivityFeed';
import StatCard from './StatCard';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReviewerDashboard = () => {
  const [pendingDocs, setPendingDocs] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        // Fetch pending documents
        const docsResponse = await api.get('/documents', { 
          params: { status: 'UnderReview' } 
        });
        console.log('Documents response:', docsResponse.data);
        
        // Handle different response structures
        let docs = [];
        if (docsResponse.data?.data) {
          docs = docsResponse.data.data;
        } else if (Array.isArray(docsResponse.data)) {
          docs = docsResponse.data;
        }
        setPendingDocs(Array.isArray(docs) ? docs : []);
        setStats({
          pending: Array.isArray(docs) ? docs.length : 0,
          approved: 0,
          rejected: 0,
        });
      } catch (error) {
        console.error('Failed to fetch:', error);
        const errorMessage = error.response?.data?.error?.message || 'Failed to load dashboard data';
        setError(errorMessage);
        toast.error(errorMessage);
        setPendingDocs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="card text-center py-8">
        <p className="text-status-danger">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Reviewer Dashboard</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard 
          label="Pending Review" 
          value={stats.pending} 
          icon={Clock} 
        />
        <StatCard 
          label="Approved" 
          value={stats.approved} 
          icon={CheckCircle} 
        />
        <StatCard 
          label="Rejected" 
          value={stats.rejected} 
          icon={XCircle} 
          color="danger" 
        />
      </div>

      <div className="mb-6">
        <h2 className="text-md font-medium mb-3">Pending Review</h2>
        {pendingDocs.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-sm text-text-tertiary">No documents pending review</p>
          </div>
        ) : (
          <div className="bg-bg-primary border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Title</th>
                    <th className="table-header">Case</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDocs.map((doc) => {
                    let caseDisplay = '—';
                    if (doc.caseId) {
                      if (typeof doc.caseId === 'string') {
                        caseDisplay = doc.caseId;
                      } else if (typeof doc.caseId === 'object' && doc.caseId.caseId) {
                        caseDisplay = doc.caseId.caseId;
                      }
                    }
                    return (
                      <tr key={doc._id} className="hover:bg-bg-tertiary">
                        <td className="table-cell font-medium">{doc.title || 'Untitled'}</td>
                        <td className="table-cell font-mono text-xs">{caseDisplay}</td>
                        <td className="table-cell">{doc.documentType || '—'}</td>
                        <td className="table-cell">
                          <span className={`badge ${
                            doc.classificationLevel === 'Restricted' ? 'badge-danger' : 
                            doc.classificationLevel === 'Confidential' ? 'badge-warning' : 
                            'badge-neutral'
                          }`}>
                            {doc.classificationLevel || 'General'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ActivityFeed title="Recent Activity" />
    </div>
  );
};

export default ReviewerDashboard;