import React from 'react';
import { AlertTriangle } from 'lucide-react';

const TamperAlertBadge = ({ size = 'sm' }) => {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 bg-status-dangerBg text-status-danger rounded ${sizes[size]}`}>
      <AlertTriangle size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
      Tampered
    </span>
  );
};

export default TamperAlertBadge;