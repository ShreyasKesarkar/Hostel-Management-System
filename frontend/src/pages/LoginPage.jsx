/**
 * Login Page Component
 *
 * Provides a clean, modern SaaS authentication portal.
 * Features 1-click quick-fill buttons for Admin, Warden, and Student roles
 * to make academic viva demonstration effortless.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Alert from '../components/Alert';
import { Building2, Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Handles form submission and calls /api/auth/login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password
      });

      if (response.data && response.data.success) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        setError(response.data.message || 'Authentication failed.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Server connection error. Ensure the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to fill and submit demo credentials
  const handleQuickLogin = (userVal, passVal) => {
    setUsername(userVal);
    setPassword(passVal);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">HostelHub Portal</h2>
          <p className="text-sm text-slate-500 mt-1">Hostel Management & Residential Services</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Sign In</h3>
          <p className="text-xs text-slate-500 mb-6">Enter your credentials to access your account</p>

          <Alert type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or alex"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Viva / Academic Demo Credentials Section */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Demo Accounts (Click to Fill)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'password123')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition"
              >
                <span className="font-semibold text-slate-800 block">👑 Admin</span>
                <span className="text-slate-400 text-[11px]">admin / password123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('warden', 'password123')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition"
              >
                <span className="font-semibold text-slate-800 block">🛡️ Warden</span>
                <span className="text-slate-400 text-[11px]">warden / password123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('alex', 'password123')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition"
              >
                <span className="font-semibold text-slate-800 block">🎓 Alex (Student)</span>
                <span className="text-slate-400 text-[11px]">alex / password123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sophia', 'password123')}
                className="p-2 text-left rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition"
              >
                <span className="font-semibold text-slate-800 block">🎓 Sophia (Student)</span>
                <span className="text-slate-400 text-[11px]">sophia / password123</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Hostel Management System Academic Project • SQLite Backend
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

