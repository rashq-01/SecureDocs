import React from 'react';
import { CASE_STATUS } from '../../utils/constants';

const CaseStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    const configs = {
      [CASE_STATUS.OPEN]: {
        label: 'Open',
        className: 'badge-success',
      },
      [CASE_STATUS.IN_PROGRESS]: {
        label: 'In Progress',
        className: 'badge-warning',
      },
      [CASE_STATUS.UNDER_REVIEW]: {
        label: 'Under Review',
        className: 'badge-info',
      },
      [CASE_STATUS.CLOSED]: {
        label: 'Closed',
        className: 'badge-neutral',
      },
      [CASE_STATUS.ARCHIVED]: {
        label: 'Archived',
        className: 'badge-neutral',
      },
    };
    return configs[status] || configs[CASE_STATUS.OPEN];
  };

  const config = getStatusConfig(status);

  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default CaseStatusBadge;