import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ActivityFeed from './ActivityFeed';
import StatCard from './StatCard';
import { FolderOpen, FilePlus } from 'lucide-react';
import toast from 'react-hot-toast';

const IODashboard = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await api.get('/cases');
        console.log('Cases response:', response.data);
        // Handle different response structures
        let casesData = [];
        if (response.data?.data?.cases) {
          casesData = response.data.data.cases;
        } else if (response.data?.data) {
          casesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          casesData = response.data;
        }
        setCases(Array.isArray(casesData) ? casesData : []);
      } catch (error) {
        console.error('Failed to fetch cases:', error);
        toast.error('Failed to load cases');
        setCases([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">My Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard 
          label="Assigned Cases" 
          value={cases.length} 
          icon={FolderOpen} 
        />
        <div className="card group cursor-pointer" onClick={() => navigate('/documents?upload=true')}>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-full bg-accent-subtle text-accent">
              <FilePlus size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider">Quick Upload</p>
              <p className="text-sm font-medium text-accent group-hover:underline mt-1">
                Upload new document
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-md font-medium mb-3">Your Cases</h2>
        {cases.length === 0 ? (
          <p className="text-sm text-text-tertiary">No cases assigned</p>
        ) : (
          <div className="bg-bg-primary border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Case ID</th>
                  <th className="table-header">Title</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(cases) && cases.map((c) => (
                  <tr key={c._id} className="hover:bg-bg-tertiary">
                    <td className="table-cell font-mono text-xs">{c.caseId || '—'}</td>
                    <td className="table-cell">{c.title || 'Untitled'}</td>
                    <td className="table-cell">
                      <span className={`badge ${c.status === 'Open' ? 'badge-success' : c.status === 'InProgress' ? 'badge-warning' : c.status === 'Closed' ? 'badge-neutral' : 'badge-neutral'}`}>
                        {c.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ActivityFeed title="Recent Activity" />
    </div>
  );
};

export default IODashboard;