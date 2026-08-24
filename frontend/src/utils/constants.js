// Add to constants.js if not already there
export const CASE_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'InProgress',
  UNDER_REVIEW: 'UnderReview',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PERMISSIONS = {
  VIEW: 'VIEW',
  DOWNLOAD: 'DOWNLOAD',
  SHARE: 'SHARE',
  EDIT: 'EDIT',
  DELETE: 'DELETE',
};

export const ROLES = {
  ADMIN: 'Admin',
  IO: 'IO',
  REVIEWER: 'Reviewer',
  LEGAL_LIAISON: 'LegalLiaison',
  AUDITOR: 'Auditor',
};

export const DOCUMENT_STATUS = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'UnderReview',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export const CLASSIFICATION = {
  GENERAL: 'General',
  CONFIDENTIAL: 'Confidential',
  RESTRICTED: 'Restricted',
};

export const DOCUMENT_TYPES = [
  'FIR',
  'Forensic Report',
  'Court Order',
  'Evidence Log',
  'Witness Statement',
  'Other',
];

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  DOCUMENTS: '/documents',
  DOCUMENT_DETAIL: '/documents/:id',
  CASES: '/cases',
  CASE_DETAIL: '/cases/:id',
  AUDIT_LOGS: '/audit-logs',
  SECURITY: '/security',
  SETTINGS: '/settings',
};

export const STATUS_COLORS = {
  [DOCUMENT_STATUS.DRAFT]: 'neutral',
  [DOCUMENT_STATUS.UNDER_REVIEW]: 'warning',
  [DOCUMENT_STATUS.APPROVED]: 'success',
  [DOCUMENT_STATUS.REJECTED]: 'danger',
  [DOCUMENT_STATUS.ARCHIVED]: 'neutral',
};

export const STATUS_LABELS = {
  [DOCUMENT_STATUS.DRAFT]: 'Draft',
  [DOCUMENT_STATUS.UNDER_REVIEW]: 'Under Review',
  [DOCUMENT_STATUS.APPROVED]: 'Approved',
  [DOCUMENT_STATUS.REJECTED]: 'Rejected',
  [DOCUMENT_STATUS.ARCHIVED]: 'Archived',
};