/**
 * Express Backend Server
 *
 * Main entry point of the Hostel Management System backend.
 * Initializes the database, registers middleware, mounts API routes,
 * and starts listening for HTTP client requests.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Ensure SQLite database and sample data are initialized
require('./database/db');

// Import modular API route handlers
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');
const roomRoutes = require('./routes/roomRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const feeRoutes = require('./routes/feeRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing (CORS) so the React frontend can call these APIs
app.use(cors({
  origin: '*', // Allow development requests from Vite frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware: Parse incoming JSON payloads and URL-encoded forms
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Hostel Management System API',
    database: 'SQLite (hostel.db)',
    timestamp: new Date().toISOString()
  });
});

// Mount Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Hostel Management System Backend Server is Running!`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Database: SQLite (backend/database/hostel.db)`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

module.exports = app;
