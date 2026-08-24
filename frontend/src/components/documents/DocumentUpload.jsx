import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as documentApi from '../../services/document.api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { X, Upload, File } from 'lucide-react';

const DocumentUpload = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    caseId: '',
    documentType: '',
    classificationLevel: 'General',
  });
  const [file, setFile] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await api.get('/cases');
        console.log('Cases response:', response.data);
        // Ensure we're setting an array
        const casesData = response.data?.data?.cases || response.data?.data || [];
        setCases(Array.isArray(casesData) ? casesData : []);
      } catch (error) {
        console.error('Failed to fetch cases:', error);
        toast.error('Failed to load cases');
        setCases([]);
      }
    };
    fetchCases();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (selected.size > maxSize) {
        toast.error('File size exceeds 25MB limit');
        return;
      }
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(selected.type)) {
        toast.error('Invalid file type. Allowed: PDF, DOCX, JPEG, PNG');
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.caseId) {
      toast.error('Please select a case');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('title', formData.title.trim());
    uploadData.append('caseId', formData.caseId);
    uploadData.append('documentType', formData.documentType);
    uploadData.append('classificationLevel', formData.classificationLevel);

    setUploading(true);
    try {
      await documentApi.uploadDocument(uploadData);
      toast.success('Document uploaded successfully');
      setFile(null);
      setFormData({
        title: '',
        caseId: '',
        documentType: '',
        classificationLevel: 'General',
      });
      onSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      const message = error.response?.data?.error?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium">Upload Document</h3>
        <button onClick={onCancel} className="text-text-tertiary hover:text-text-primary transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Title <span className="text-status-danger">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter document title"
            required
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Case <span className="text-status-danger">*</span>
          </label>
          <select
            name="caseId"
            value={formData.caseId}
            onChange={handleChange}
            className="input-field"
            required
            disabled={uploading || cases.length === 0}
          >
            <option value="">Select a case</option>
            {Array.isArray(cases) && cases.map((c) => (
              <option key={c._id} value={c._id}>
                {c.caseId} — {c.title}
              </option>
            ))}
          </select>
          {cases.length === 0 && (
            <p className="text-xs text-text-tertiary mt-1">No cases available. Please contact admin.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Document Type <span className="text-status-danger">*</span>
          </label>
          <select
            name="documentType"
            value={formData.documentType}
            onChange={handleChange}
            className="input-field"
            required
            disabled={uploading}
          >
            <option value="">Select type</option>
            <option value="FIR">FIR</option>
            <option value="Forensic Report">Forensic Report</option>
            <option value="Court Order">Court Order</option>
            <option value="Evidence Log">Evidence Log</option>
            <option value="Witness Statement">Witness Statement</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Classification</label>
          <select
            name="classificationLevel"
            value={formData.classificationLevel}
            onChange={handleChange}
            className="input-field"
            disabled={uploading}
          >
            <option value="General">General</option>
            <option value="Confidential">Confidential</option>
            <option value="Restricted">Restricted</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            File <span className="text-status-danger">*</span>
          </label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors">
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File size={20} className="text-accent" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-text-tertiary">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                  disabled={uploading}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload size={24} className="mx-auto text-text-tertiary mb-2" />
                <p className="text-sm text-text-secondary">Click to upload or drag and drop</p>
                <p className="text-xs text-text-tertiary">PDF, DOCX, JPEG, PNG (max 25MB)</p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={uploading || !file}
            className="btn-primary flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={uploading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentUpload;