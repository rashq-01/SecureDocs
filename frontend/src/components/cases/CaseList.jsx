import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as caseApi from '../../services/case.api';
import CaseStatusBadge from './CaseStatusBadge';
import { Search, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const CaseList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
  });

  // Always read the latest filters inside fetchCases, even when it's called from an
  // event listener that was registered once on mount.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    fetchCases();

    // Case _ids are regenerated every time the DB is re-seeded/reset, which would
    // leave this list showing stale rows that 404 when opened. Refetch whenever the
    // tab regains focus so the ids on screen always match the current database.
    const refetchOnReturn = () => {
      if (document.visibilityState === 'visible') fetchCases();
    };
    window.addEventListener('focus', refetchOnReturn);
    document.addEventListener('visibilitychange', refetchOnReturn);
    return () => {
      window.removeEventListener('focus', refetchOnReturn);
      document.removeEventListener('visibilitychange', refetchOnReturn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await caseApi.getCases(filtersRef.current);
      console.log('=== CASE LIST API RESPONSE ===');
      console.log('Response data:', response.data);
      
      let casesData = [];
      
      // Try different response structures
      if (response.data?.data?.cases) {
        casesData = response.data.data.cases;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        casesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        casesData = response.data;
      } else if (response.data?.data && typeof response.data.data === 'object') {
        casesData = response.data.data.cases || [];
      }
      
      console.log('=== CASES FROM SERVER ===');
      console.log('Number of cases:', casesData.length);
      
      // Log each case with its ID for debugging
      if (Array.isArray(casesData) && casesData.length > 0) {
        casesData.forEach((c, index) => {
          console.log(`Case ${index + 1}:`, {
            caseId: c.caseId,
            title: c.title,
            _id: c._id,
            id: c.id,
            hasId: !!c._id,
          });
        });
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

  const handleViewCase = (caseData) => {
    // Use the _id from the case object
    const caseId = caseData._id || caseData.id;
    
    console.log('=== VIEW CASE ===');
    console.log('Case data:', caseData);
    console.log('Using ID:', caseId);
    
    if (!caseId) {
      toast.error('Invalid case ID');
      return;
    }
    
    navigate(`/cases/${caseId}`);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'badge-neutral',
      Medium: 'badge-info',
      High: 'badge-warning',
      Critical: 'badge-danger',
    };
    return colors[priority] || 'badge-neutral';
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading cases...</div>;
  }

  return (
    <div>
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search cases..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && fetchCases()}
              className="input-field pl-9"
            />
          </div>
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="input-field w-40"
        >
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="InProgress">In Progress</option>
          <option value="UnderReview">Under Review</option>
          <option value="Closed">Closed</option>
          <option value="Archived">Archived</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
          className="input-field w-40"
        >
          <option value="">All Priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <button onClick={fetchCases} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary">No cases found</p>
        </div>
      ) : (
        <div className="bg-bg-primary border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Case ID</th>
                  <th className="table-header">Title</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  // Get the ID - MongoDB uses _id
                  const id = c._id || c.id;
                  console.log(`Rendering case ${c.caseId} with ID: ${id}`);
                  
                  return (
                    <tr key={id || c.caseId} className="hover:bg-bg-tertiary">
                      <td className="table-cell font-mono text-xs">{c.caseId || '—'}</td>
                      <td className="table-cell font-medium">{c.title || 'Untitled'}</td>
                      <td className="table-cell">{c.department || '—'}</td>
                      <td className="table-cell">
                        <CaseStatusBadge status={c.status} />
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getPriorityColor(c.priority)}`}>
                          {c.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleViewCase(c)}
                          className="text-text-secondary hover:text-text-primary transition-colors"
                          title="View case"
                          disabled={!id}
                        >
                          <Eye size={16} />
                        </button>
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
  );
};

export default CaseList;