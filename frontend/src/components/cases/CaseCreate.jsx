import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as caseApi from '../../services/case.api';
import { getUsers } from '../../services/admin.api';
import { X, UserPlus, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';

const CaseCreate = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    caseId: '',
    title: '',
    department: '',
    description: '',
    priority: 'Medium',
    tags: [],
    assignedOfficers: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        console.log('Users response:', response.data);
        const usersData = response.data?.data || [];
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load users');
      }
    };
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const toggleOfficer = (officerId) => {
    setFormData(prev => {
      const isAssigned = prev.assignedOfficers.includes(officerId);
      return {
        ...prev,
        assignedOfficers: isAssigned
          ? prev.assignedOfficers.filter(id => id !== officerId)
          : [...prev.assignedOfficers, officerId],
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.caseId.trim()) {
      newErrors.caseId = 'Case ID is required';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating case with data:', formData);
      
      // Prepare data for API
      const caseData = {
        caseId: formData.caseId.trim(),
        title: formData.title.trim(),
        department: formData.department.trim(),
        description: formData.description.trim() || '',
        priority: formData.priority,
        tags: formData.tags,
        assignedOfficers: formData.assignedOfficers,
      };
      
      console.log('Sending data:', caseData);
      
      const response = await caseApi.createCase(caseData);
      console.log('Create case response:', response.data);
      
      toast.success('Case created successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to create case:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.error?.message || 'Failed to create case';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const availableOfficers = users.filter(u => u.role === 'IO' && u.isActive);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium">Create New Case</h3>
        <button onClick={onCancel} className="text-text-tertiary hover:text-text-primary">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Case ID <span className="text-status-danger">*</span>
            </label>
            <input
              type="text"
              name="caseId"
              value={formData.caseId}
              onChange={handleChange}
              className={`input-field ${errors.caseId ? 'input-field-error' : ''}`}
              placeholder="e.g., FIR-2026-001"
              disabled={loading}
            />
            {errors.caseId && (
              <p className="text-xs text-status-danger mt-1">{errors.caseId}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Priority
            </label>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Title <span className="text-status-danger">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`input-field ${errors.title ? 'input-field-error' : ''}`}
            placeholder="Enter case title"
            disabled={loading}
          />
          {errors.title && (
            <p className="text-xs text-status-danger mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Department <span className="text-status-danger">*</span>
          </label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            className={`input-field ${errors.department ? 'input-field-error' : ''}`}
            placeholder="e.g., Mumbai Division"
            disabled={loading}
          />
          {errors.department && (
            <p className="text-xs text-status-danger mt-1">{errors.department}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="input-field"
            rows="3"
            placeholder="Enter case description"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Tags
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="input-field flex-1"
              placeholder="Add tag..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-secondary"
              disabled={loading}
            >
              Add
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="badge badge-info flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-status-danger"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Assign Officers
          </label>
          <div className="relative">
            <select
              multiple
              className="input-field min-h-[100px] py-2"
              value={formData.assignedOfficers}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions);
                const values = options.map(option => option.value);
                setFormData(prev => ({ ...prev, assignedOfficers: values }));
              }}
              disabled={loading || availableOfficers.length === 0}
            >
              {availableOfficers.length === 0 ? (
                <option disabled value="">No officers available</option>
              ) : (
                availableOfficers.map(officer => (
                  <option key={officer._id} value={officer._id} className="py-1 px-2">
                    {officer.name} ({officer.email})
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-text-secondary mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating...' : 'Create Case'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CaseCreate;