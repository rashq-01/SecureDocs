import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date, formatStr = 'MMM dd, yyyy HH:mm') => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr);
  } catch {
    return '—';
  }
};

export const timeAgo = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '—';
  }
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getStatusColor = (status, type = 'document') => {
  const colors = {
    [type === 'document' ? 'Draft' : 'Open']: 'neutral',
    [type === 'document' ? 'UnderReview' : 'InProgress']: 'warning',
    Approved: 'success',
    Rejected: 'danger',
    Archived: 'neutral',
    Closed: 'neutral',
  };
  return colors[status] || 'neutral';
};

export const getPriorityColor = (priority) => {
  const colors = {
    Low: 'neutral',
    Medium: 'info',
    High: 'warning',
    Critical: 'danger',
  };
  return colors[priority] || 'neutral';
};

export const getClassificationColor = (level) => {
  const colors = {
    General: 'neutral',
    Confidential: 'warning',
    Restricted: 'danger',
  };
  return colors[level] || 'neutral';
};

export const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const debounce = (fn, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export const copyToClipboard = (text) => {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

export const downloadFile = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};