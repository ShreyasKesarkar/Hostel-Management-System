/**
 * Axios API Client Configuration
 *
 * Configures the base HTTP client for communicating with the Express backend.
 * Automatically attaches the JWT bearer token from localStorage on every request.
 */

import axios from 'axios';

// Create configured Axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Injects the authorization header before each API call
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hostel_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Catches unauthorized 401 errors and handles token expiry
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token is invalid or expired, clear local storage and redirect to login
      localStorage.removeItem('hostel_token');
      localStorage.removeItem('hostel_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

