import React from 'react';
import { classNames } from '../../utils/helpers';

const StatCard = ({ label, value, icon: Icon, color = 'blue', subtitle }) => {
  const colorClasses = {
    blue: 'bg-accent-subtle text-accent',
    green: 'bg-status-successBg text-status-success',
    yellow: 'bg-status-warningBg text-status-warning',
    red: 'bg-status-dangerBg text-status-danger',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={classNames('p-2 rounded', colorClasses[color])}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
          <p className="text-xl font-semibold text-text-primary">{value}</p>
          {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;