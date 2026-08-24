import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RoleGate from './RoleGate';
import { 
  LayoutDashboard, 
  Files, 
  FileText, 
  LogOut,
  User,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'IO', 'Reviewer', 'LegalLiaison', 'Auditor'] },
    { path: '/documents', label: 'Documents', icon: Files, roles: ['Admin', 'IO', 'Reviewer', 'LegalLiaison'] },
    { path: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, roles: ['Admin', 'Auditor'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    const badges = {
      Admin: 'badge-danger',
      IO: 'badge-info',
      Reviewer: 'badge-warning',
      LegalLiaison: 'badge-success',
      Auditor: 'badge-neutral',
    };
    return badges[role] || 'badge-neutral';
  };

  return (
    <aside className="w-64 bg-bg-primary border-r border-border flex flex-col h-screen flex-shrink-0">
      <div className="p-4 border-b border-border">
        <h1 className="text-md font-semibold text-text-primary">SecureDocs</h1>
        <p className="text-xs text-text-secondary">MHA Document System</p>
      </div>

      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <RoleGate key={item.path} roles={item.roles}>
            <Link
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors duration-150 ${
                location.pathname === item.path
                  ? 'bg-accent-subtle text-accent font-medium'
                  : 'text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          </RoleGate>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-accent">
            <User size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.name || 'User'}</p>
            <span className={`badge ${getRoleBadge(user?.role)} text-xs`}>
              {user?.role || 'Guest'}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded text-sm text-text-secondary hover:bg-bg-tertiary w-full transition-colors duration-150"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Navbar;