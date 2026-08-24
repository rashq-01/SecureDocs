import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as caseApi from '../../services/case.api';
import { getUsers } from '../../services/admin.api';
import { UserPlus, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';

const CaseMembers = ({ caseData, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedOfficers, setSelectedOfficers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        setUsers(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  const canManage = user?.role === 'Admin';

  const handleAddMembers = async () => {
    if (selectedOfficers.length === 0) {
      toast.error('Please select at least one officer');
      return;
    }

    setLoading(true);
    try {
      await caseApi.addCaseMembers(caseData._id, selectedOfficers);
      toast.success('Members added successfully');
      setShowAdd(false);
      setSelectedOfficers([]);
      onUpdate();
    } catch (error) {
      console.error('Failed to add members:', error);
      toast.error('Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the case?')) return;

    setLoading(true);
    try {
      await caseApi.removeCaseMember(caseData._id, userId);
      toast.success('Member removed successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const toggleOfficer = (officerId) => {
    setSelectedOfficers(prev =>
      prev.includes(officerId)
        ? prev.filter(id => id !== officerId)
        : [...prev, officerId]
    );
  };

  const availableOfficers = users.filter(u => u.role === 'IO' && u.isActive);
  const assignedOfficerIds = caseData.assignedOfficers?.map(o => o._id) || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium">Case Members</h3>
        {canManage && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <UserPlus size={14} /> Add Members
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-4 p-4 bg-bg-secondary rounded">
          <p className="text-sm font-medium mb-2">Select Officers to Add</p>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto mb-3">
            {availableOfficers
              .filter(o => !assignedOfficerIds.includes(o._id))
              .map(officer => (
                <button
                  key={officer._id}
                  type="button"
                  onClick={() => toggleOfficer(officer._id)}
                  className={`flex items-center gap-2 p-2 rounded text-sm transition-colors ${
                    selectedOfficers.includes(officer._id)
                      ? 'bg-accent-subtle text-accent border border-accent'
                      : 'bg-bg-primary hover:bg-bg-tertiary border border-border'
                  }`}
                  disabled={loading}
                >
                  <span className="truncate">{officer.name}</span>
                  <span className="text-xs text-text-secondary">({officer.email})</span>
                </button>
              ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAddMembers}
              disabled={loading || selectedOfficers.length === 0}
              className="btn-primary text-sm"
            >
              {loading ? 'Adding...' : `Add ${selectedOfficers.length} Member${selectedOfficers.length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setSelectedOfficers([]);
              }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {caseData.assignedOfficers?.length === 0 ? (
        <p className="text-sm text-text-tertiary">No members assigned</p>
      ) : (
        <div className="space-y-2">
          {caseData.assignedOfficers?.map((officer) => (
            <div key={officer._id} className="flex items-center justify-between p-3 bg-bg-secondary rounded">
              <div>
                <p className="text-sm font-medium">{officer.name}</p>
                <p className="text-xs text-text-secondary">{officer.email} • {officer.role}</p>
              </div>
              {canManage && (
                <button
                  onClick={() => handleRemoveMember(officer._id)}
                  className="text-text-tertiary hover:text-status-danger transition-colors"
                  disabled={loading}
                  title="Remove member"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseMembers;