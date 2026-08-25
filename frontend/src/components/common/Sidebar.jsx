import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Files,
  FolderOpen,
  ClipboardList,
  Shield,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
} from 'lucide-react';
import { ROLES } from '../../utils/constants';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const getNavItems = () => {
    const items = [];

    // Common items for all users
    items.push({
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    });

    // Documents - all except Auditor (Auditor sees metadata only)
    if (user?.role !== ROLES.AUDITOR) {
      items.push({
        path: '/documents',
        label: 'Documents',
        icon: Files,
      });
    }

    // Cases - IO, Reviewer, Admin
    if ([ROLES.ADMIN, ROLES.IO, ROLES.REVIEWER].includes(user?.role)) {
      items.push({
        path: '/cases',
        label: 'Cases',
        icon: FolderOpen,
      });
    }

    // Audit Logs - Auditor, Admin
    if ([ROLES.ADMIN, ROLES.AUDITOR].includes(user?.role)) {
      items.push({
        path: '/audit-logs',
        label: 'Audit Logs',
        icon: ClipboardList,
      });
    }

    // Users - Admin only
    if (user?.role === ROLES.ADMIN) {
      items.push({
        path: '/admin/users',
        label: 'Users',
        icon: Users,
      });
    }

    // Security - Admin only
    if (user?.role === ROLES.ADMIN) {
      items.push({
        path: '/security',
        label: 'Security',
        icon: Shield,
      });
    }

    // Settings - Available to all users
    items.push({
      path: '/settings',
      label: 'Settings',
      icon: Settings,
    });

    return items;
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      [ROLES.ADMIN]: 'danger',
      [ROLES.IO]: 'info',
      [ROLES.REVIEWER]: 'warning',
      [ROLES.LEGAL_LIAISON]: 'success',
      [ROLES.AUDITOR]: 'neutral',
    };
    return colors[role] || 'neutral';
  };

  return (
    <aside
      className={`bg-bg-surface backdrop-blur-[20px] border-r border-border flex flex-col h-screen transition-all duration-300 relative z-20 ${
        collapsed ? 'w-20' : 'w-64'
      } flex-shrink-0`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            SD
          </div>
          {!collapsed && (
            <span className="font-semibold text-text-primary text-lg">SecureDocs</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto relative">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 z-10 ${
                isActive
                  ? 'text-accent font-medium bg-accent-glow'
                  : 'text-text-secondary hover:bg-accent-subtle hover:text-text-primary'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-medium flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
              <span className={`badge badge-${getRoleBadgeColor(user?.role)} text-xs`}>
                {user?.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`text-text-secondary hover:text-text-primary transition-colors ${
              collapsed ? 'mt-2' : ''
            }`}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;