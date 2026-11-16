/**
 * Room Routes
 *
 * Exposes endpoints for managing hostel rooms and checking occupancy.
 */

const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Viewing rooms is available to all authenticated users
router.get('/', roomController.getAllRooms);
router.get('/:id', roomController.getRoomById);

// Room creation, updates, and deletion require Admin or Warden privilege
router.post('/', requireRole('admin', 'warden'), roomController.createRoom);
router.put('/:id', requireRole('admin', 'warden'), roomController.updateRoom);
router.delete('/:id', requireRole('admin'), roomController.deleteRoom);

module.exports = router;

