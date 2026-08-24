import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import IODashboard from '../components/dashboard/IODashboard';
import ReviewerDashboard from '../components/dashboard/ReviewerDashboard';
import AuditorDashboard from '../components/dashboard/AuditorDashboard';
import LegalLiaisonDashboard from '../components/dashboard/LegalLiaisonDashboard';
import { ROLES } from '../utils/constants';

const Dashboard = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case ROLES.ADMIN:
        return <AdminDashboard />;
      case ROLES.IO:
        return <IODashboard />;
      case ROLES.REVIEWER:
        return <ReviewerDashboard />;
      case ROLES.AUDITOR:
        return <AuditorDashboard />;
      case ROLES.LEGAL_LIAISON:
        return <LegalLiaisonDashboard />;
      default:
        return (
          <div className="card text-center py-12">
            <p className="text-text-secondary">Unknown role</p>
          </div>
        );
    }
  };

  return <div>{renderDashboard()}</div>;
};

export default Dashboard;