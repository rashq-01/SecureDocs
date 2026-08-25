import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as documentApi from '../../services/document.api';
import TamperAlertBadge from './TamperAlertBadge';
import { Search, FileText, Download, Eye, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDate, formatFileSize } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DocumentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const response = await documentApi.getDocuments(params);
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleDownload = async (id, fileName, e) => {
    e.stopPropagation();
    try {
      const response = await documentApi.downloadDocument(id);
      
      const blob = new Blob([response.data]);
      
      let finalFileName = fileName || 'document.pdf';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches != null && matches[1]) {
          finalFileName = matches[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', finalFileName);
      window.document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

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

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
          <Search className="absolute left-3 top-2.5 text-text-tertiary" size={18} />
          <button type="submit" className="hidden">Search</button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field bg-bg-secondary"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="UnderReview">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button
            onClick={fetchDocuments}
            className="btn-secondary p-2"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <FileText className="mx-auto text-text-tertiary mb-3" size={40} />
          <h3 className="text-lg font-medium text-text-primary mb-1">No documents found</h3>
          <p className="text-text-secondary text-sm">
            {search || statusFilter ? 'Try adjusting your filters.' : "You don't have access to any documents yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-secondary text-text-secondary">
              <tr>
                <th className="p-3 font-medium rounded-tl">Title</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Case ID</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium rounded-tr">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc) => (
                <tr 
                  key={doc._id} 
                  className="hover:bg-bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/documents/${doc._id}`)}
                >
                  <td className="p-3">
                    <div className="font-medium text-text-primary flex items-center gap-2">
                      {doc.title}
                      {doc.tamperFlag && <TamperAlertBadge />}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5 truncate max-w-xs">
                      {doc.originalFileName} ({formatFileSize(doc.fileSize)})
                    </div>
                    {doc.aiSummary && (
                      <div className="text-xs text-accent mt-1 flex items-center gap-1 truncate max-w-sm" title={doc.aiSummary}>
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="truncate">{doc.aiSummary}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-text-secondary">{doc.documentType}</td>
                  <td className="p-3 text-text-secondary">
                    {doc.caseId?.caseId || '—'}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${getStatusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-3 text-text-secondary whitespace-nowrap">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/documents/${doc._id}`); }}
                        className="p-1.5 text-text-secondary hover:text-accent rounded hover:bg-accent-subtle transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDownload(doc._id, doc.originalFileName, e)}
                        className="p-1.5 text-text-secondary hover:text-accent rounded hover:bg-accent-subtle transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentList;