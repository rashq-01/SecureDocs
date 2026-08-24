/**
 * Single source of truth for RBAC permissions
 * Role × Action permission matrix
 */
const permissionMatrix = {
  Admin: {
    upload: true,
    view: true,
    download: true,
    changeStatus: true,
    createCase: true,
    assignCase: true,
    manageUsers: true,
    viewAudit: true,
    manageRoles: true,
    deleteDocument: true,
    share: true,
  },
  IO: {
    upload: true,
    view: true,
    download: true,
    changeStatus: false,
    createCase: false,
    assignCase: false,
    manageUsers: false,
    viewAudit: false,
    manageRoles: false,
    deleteDocument: false,
    share: true,
  },
  Reviewer: {
    upload: false,
    view: true,
    download: true,
    changeStatus: true,
    createCase: false,
    assignCase: false,
    manageUsers: false,
    viewAudit: false,
    manageRoles: false,
    deleteDocument: false,
    share: false,
  },
  LegalLiaison: {
    upload: false,
    view: true,
    download: true,
    changeStatus: false,
    createCase: false,
    assignCase: false,
    manageUsers: false,
    viewAudit: false,
    manageRoles: false,
    deleteDocument: false,
    share: false,
  },
  Auditor: {
    upload: false,
    view: true, // Metadata only
    download: false,
    changeStatus: false,
    createCase: false,
    assignCase: false,
    manageUsers: false,
    viewAudit: true,
    manageRoles: false,
    deleteDocument: false,
    share: false,
  },
};

// Action to role mapping for quick checks
const actionRoles = {};
const actions = ['upload', 'view', 'download', 'changeStatus', 'createCase', 
  'assignCase', 'manageUsers', 'viewAudit', 'manageRoles', 'deleteDocument', 'share'];

actions.forEach(action => {
  actionRoles[action] = Object.keys(permissionMatrix).filter(
    role => permissionMatrix[role] && permissionMatrix[role][action] === true
  );
});

/**
 * Check if a role has permission for an action
 */
const hasPermission = (role, action) => {
  if (!permissionMatrix[role]) return false;
  return permissionMatrix[role][action] === true;
};

/**
 * Get all roles that can perform an action
 */
const getRolesForAction = (action) => {
  return actionRoles[action] || [];
};

module.exports = {
  permissionMatrix,
  actionRoles,
  hasPermission,
  getRolesForAction,
};