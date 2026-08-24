import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  const demoAccounts = [
    { role: 'Admin', email: 'admin@mha.gov.in' },
    { role: 'IO', email: 'io@mha.gov.in' },
    { role: 'Reviewer', email: 'reviewer@mha.gov.in' },
    { role: 'Auditor', email: 'auditor@mha.gov.in' },
    { role: 'Legal Liaison', email: 'legal@mha.gov.in' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <div className="bg-bg-primary border border-border rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">SecureDocs</h1>
          <p className="text-sm text-text-secondary mt-1">MHA Document Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="officer@mha.gov.in"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-text-tertiary text-center mb-2">Demo Accounts</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                onClick={() => setEmail(account.email)}
                className="text-text-secondary hover:text-accent text-left px-2 py-1 rounded hover:bg-bg-tertiary transition-colors"
              >
                {account.role}
                <br />
                <span className="text-text-tertiary text-[10px]">{account.email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-text-tertiary text-center mt-2">Password: password123</p>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[10px] text-text-tertiary text-center">
            API: {import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;