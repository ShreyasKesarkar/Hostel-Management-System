/**
 * Authentication Routes
 *
 * Routes for login, session check, profile updates, and password changes.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public route: User login
router.post('/login', authController.login);

// Protected routes: Require valid JWT token
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;

