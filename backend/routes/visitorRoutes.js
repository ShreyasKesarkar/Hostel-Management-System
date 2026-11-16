/**
 * Visitor Routes
 *
 * Routes for recording and updating campus visitor entries and departures.
 */

const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Authenticated users can view visitors (students see their visitors, staff see all)
router.get('/', visitorController.getAllVisitors);

// Check-in and check-out management
router.post('/', requireRole('admin', 'warden'), visitorController.checkInVisitor);
router.put('/:id/checkout', requireRole('admin', 'warden'), visitorController.checkOutVisitor);
router.delete('/:id', requireRole('admin'), visitorController.deleteVisitor);

module.exports = router;

