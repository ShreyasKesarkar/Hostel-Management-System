/**
 * Room Allocation Routes
 *
 * Routes for assigning rooms, room transfers, vacating beds, and viewing allocation history.
 */

const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// All authenticated users can read allocations (e.g. students seeing their history)
router.get('/', allocationController.getAllAllocations);

// Allocating, transferring, and vacating rooms require Admin or Warden privilege
router.post('/', requireRole('admin', 'warden'), allocationController.allocateRoom);
router.post('/transfer', requireRole('admin', 'warden'), allocationController.transferRoom);
router.post('/:id/vacate', requireRole('admin', 'warden'), allocationController.vacateRoom);

module.exports = router;

