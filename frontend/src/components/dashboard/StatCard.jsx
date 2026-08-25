import React from 'react';
import { classNames } from '../../utils/helpers';

const StatCard = ({ label, value, icon: Icon, color = 'accent', subtitle }) => {
  // Design v2 rule: Only use danger if value > 0 and flagged as danger, otherwise default to accent
  const isConcerning = color === 'danger' && Number(value) > 0;
  
  const bgClass = isConcerning ? 'bg-status-dangerBg text-status-danger' : 'bg-accent-subtle text-accent';

  return (
    <div className="card group">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="flex items-center gap-3 relative z-10">
        <div className={classNames('p-2 rounded-full', bgClass)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
          <p className="text-[28px] leading-tight font-bold text-text-primary tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;