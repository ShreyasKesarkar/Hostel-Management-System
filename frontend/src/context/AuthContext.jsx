/**
 * Authentication Context Provider
 *
 * Manages user login state, token persistence, user profile, and role access
 * across the entire React component tree.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // useState hooks to store current user details and auth token
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hostel_token') || null);
  const [loading, setLoading] = useState(true);

  // useEffect runs on initial mount to verify token and load current user profile
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('hostel_token');
      if (storedToken) {
        try {
          // Verify token against backend /api/auth/me
          const response = await api.get('/auth/me');
          if (response.data && response.data.success) {
            setUser(response.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Handles user login: stores token and updates state
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('hostel_token', authToken);
    localStorage.setItem('hostel_user', JSON.stringify(userData));
  };

  // Handles user logout: purges tokens and redirects to login
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hostel_token');
    localStorage.removeItem('hostel_user');
  };

  // Refreshes profile details after an update
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data && response.data.success) {
        setUser(response.data.user);
        localStorage.setItem('hostel_user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isWarden: user?.role === 'warden',
    isStudent: user?.role === 'student',
    isStaff: user?.role === 'admin' || user?.role === 'warden',
    login,
    logout,
    refreshUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook for convenient access to AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

