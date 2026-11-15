/**
 * Dashboard Layout Component
 *
 * Provides the overarching SaaS layout:
 * 1. Fixed responsive sidebar navigation with dynamic role-filtered items.
 * 2. Clean topbar displaying active user name, role pill badge, and notifications indicator.
 * 3. Mobile drawer menu for tablets and smartphones.
 * 4. Main content outlet.
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  MessageSquareWarning,
  Receipt,
  UserCheck,
  Wrench,
  User,
  LogOut,
  Menu,
  X,
  Building2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout, isAdmin, isWarden, isStudent } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define navigation items with role permissions
  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'warden', 'student']
    },
    {
      name: 'Students',
      path: '/students',
      icon: Users,
      roles: ['admin', 'warden']
    },
    {
      name: 'Rooms & Allocations',
      path: '/rooms',
      icon: BedDouble,
      roles: ['admin', 'warden', 'student']
    },
    {
      name: 'Complaints',
      path: '/complaints',
      icon: MessageSquareWarning,
      roles: ['admin', 'warden', 'student']
    },
    {
      name: 'Fees & Invoices',
      path: '/fees',
      icon: Receipt,
      roles: ['admin', 'warden', 'student']
    },
    {
      name: 'Visitor Pass',
      path: '/visitors',
      icon: UserCheck,
      roles: ['admin', 'warden', 'student']
    },
    {
      name: 'Maintenance',
      path: '/maintenance',
      icon: Wrench,
      roles: ['admin', 'warden']
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: User,
      roles: ['admin', 'warden', 'student']
    }
  ];

  // Filter items based on currently logged in user's role
  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-slate-200">
        {/* App Logo & Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200/80 gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">HostelHub</h1>
            <p className="text-[11px] text-slate-500 font-medium">Campus Housing</p>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs uppercase">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.fullName || user?.username}</p>
                <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white border-r border-slate-200 flex flex-col z-10">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm">HostelHub</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Application Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Campus Hostel Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User role pill badge */}
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                  isAdmin
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : isWarden
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {user?.role?.toUpperCase()}
              </span>
            </div>

            {/* Profile Avatar & Name */}
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-700">
                {user?.fullName || user?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

