/**
 * Dashboard Routes
 *
 * Provides aggregated statistics and real-time operational metrics.
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// Protected route: Any authenticated user can view their dashboard stats
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

module.exports = router;

