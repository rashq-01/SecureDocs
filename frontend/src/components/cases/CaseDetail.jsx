import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as caseApi from '../../services/case.api';
import CaseStatusBadge from './CaseStatusBadge';
import { formatDate } from '../../utils/helpers';
import { Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CaseDetail = ({ caseData, onUpdate }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: caseData.title || '',
    description: caseData.description || '',
    priority: caseData.priority || 'Medium',
    department: caseData.department || '',
  });

  const canEdit = user?.role === 'Admin';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await caseApi.updateCase(caseData._id, formData);
      toast.success('Case updated successfully');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update case:', error);
      toast.error('Failed to update case');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: caseData.title || '',
      description: caseData.description || '',
      priority: caseData.priority || 'Medium',
      department: caseData.department || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-medium">Edit Case</h3>
          <button onClick={handleCancel} className="text-text-tertiary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input-field"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="input-field"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="input-field"
              disabled={loading}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-field"
              rows="4"
              disabled={loading}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={handleCancel} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-md font-medium">{caseData.title}</h3>
          <p className="text-sm text-text-secondary">Case ID: {caseData.caseId}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-text-secondary hover:text-text-primary"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-text-secondary">Department:</span> {caseData.department || '—'}
        </div>
        <div>
          <span className="text-text-secondary">Status:</span>{' '}
          <CaseStatusBadge status={caseData.status} />
        </div>
        <div>
          <span className="text-text-secondary">Priority:</span>{' '}
          <span className={`badge ${
            caseData.priority === 'Critical' ? 'badge-danger' :
            caseData.priority === 'High' ? 'badge-warning' :
            caseData.priority === 'Medium' ? 'badge-info' :
            'badge-neutral'
          }`}>
            {caseData.priority || 'Medium'}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">Created:</span> {formatDate(caseData.createdAt)}
        </div>
        <div className="col-span-2">
          <span className="text-text-secondary">Description:</span>
          <p className="mt-1">{caseData.description || 'No description provided'}</p>
        </div>
        {caseData.tags && caseData.tags.length > 0 && (
          <div className="col-span-2">
            <span className="text-text-secondary">Tags:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {caseData.tags.map(tag => (
                <span key={tag} className="badge badge-info">#{tag}</span>
              ))}
            </div>
          </div>
        )}
        {caseData.documentCount !== undefined && (
          <div className="col-span-2">
            <span className="text-text-secondary">Documents:</span> {caseData.documentCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseDetail;