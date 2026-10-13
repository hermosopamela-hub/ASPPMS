// Who may do what. The browser app gets the list for the signed-in role from /auth/me and
// only uses it to hide buttons; the server checks the same list on every route.
const ROLE_PERMISSIONS = {
  PURCHASING_MANAGER: [
    'VIEW_DASHBOARD', 'VIEW_SUPPLIERS', 'VIEW_MATERIALS', 'VIEW_PURCHASES', 'VIEW_REPORTS', 'EXPORT_REPORTS',
    'MANAGE_ALERTS',
    'MANAGE_SETTINGS', // the manager can configure thresholds
    'VIEW_AUDIT_LOGS',
  ],
  PURCHASING_ASSISTANT_MANAGER: [
    'VIEW_DASHBOARD', 'VIEW_SUPPLIERS', 'VIEW_MATERIALS', 'VIEW_PURCHASES', 'VIEW_REPORTS', 'EXPORT_REPORTS',
    'MANAGE_ALERTS', 'VIEW_AUDIT_LOGS',
  ],
  PURCHASING_ANALYST: [
    'VIEW_DASHBOARD', 'VIEW_SUPPLIERS', 'MANAGE_SUPPLIERS', 'VIEW_MATERIALS', 'MANAGE_MATERIALS',
    'VIEW_PURCHASES', 'MANAGE_PURCHASES', 'IMPORT_DATA', 'VIEW_REPORTS', 'EXPORT_REPORTS', 'MANAGE_ALERTS',
  ],
  ADMIN: [
    'VIEW_DASHBOARD', 'VIEW_SUPPLIERS', 'MANAGE_SUPPLIERS', 'VIEW_MATERIALS', 'MANAGE_MATERIALS',
    'VIEW_PURCHASES', 'MANAGE_PURCHASES', 'IMPORT_DATA', 'MANAGE_ALERTS', 'VIEW_REPORTS', 'EXPORT_REPORTS',
    'MANAGE_SETTINGS', 'VIEW_AUDIT_LOGS', 'MANAGE_USERS',
  ],
};

const ROLES = Object.keys(ROLE_PERMISSIONS);
const permissionsFor = (role) => ROLE_PERMISSIONS[role] || [];
const can = (role, permission) => permissionsFor(role).includes(permission);

module.exports = { ROLE_PERMISSIONS, ROLES, permissionsFor, can };
