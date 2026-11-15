/**
 * Main Application Component and Router Configuration
 *
 * Configures client-side routing with React Router:
 * - Public routes (/login)
 * - Protected routes wrapped in DashboardLayout
 * - Role-based route guards
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import RoomsPage from './pages/RoomsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import FeesPage from './pages/FeesPage';
import VisitorsPage from './pages/VisitorsPage';
import MaintenancePage from './pages/MaintenancePage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Route guard component: Protects authenticated routes and checks permissions
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Students directory: Admin and Warden only */}
            <Route
              path="students"
              element={
                <ProtectedRoute allowedRoles={['admin', 'warden']}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />

            {/* Rooms and Allocations */}
            <Route path="rooms" element={<RoomsPage />} />

            {/* Complaints */}
            <Route path="complaints" element={<ComplaintsPage />} />

            {/* Fees */}
            <Route path="fees" element={<FeesPage />} />

            {/* Visitors */}
            <Route path="visitors" element={<VisitorsPage />} />

            {/* Facilities Maintenance: Admin and Warden only */}
            <Route
              path="maintenance"
              element={
                <ProtectedRoute allowedRoles={['admin', 'warden']}>
                  <MaintenancePage />
                </ProtectedRoute>
              }
            />

            {/* User Profile */}
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* 404 Catch-All Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
