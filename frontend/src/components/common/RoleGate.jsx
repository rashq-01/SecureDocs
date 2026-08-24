import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const RoleGate = ({ children, roles, fallback = null, invert = false }) => {
  const { user } = useAuth();

  if (!user) return null;

  const hasAccess = Array.isArray(roles)
    ? roles.includes(user.role)
    : user.role === roles;

  const shouldShow = invert ? !hasAccess : hasAccess;

  return shouldShow ? children : fallback;
};

export default RoleGate;