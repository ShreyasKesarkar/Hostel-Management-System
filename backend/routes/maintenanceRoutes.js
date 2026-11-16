/**
 * Maintenance Routes
 *
 * Routes for reporting, tracking, and resolving hostel maintenance issues.
 */

const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Authenticated users can view maintenance tickets
router.get('/', maintenanceController.getAllMaintenance);

// Submitting maintenance can be done by warden or admin
router.post('/', requireRole('admin', 'warden'), maintenanceController.createMaintenance);
router.put('/:id', requireRole('admin', 'warden'), maintenanceController.updateMaintenance);
router.delete('/:id', requireRole('admin'), maintenanceController.deleteMaintenance);

module.exports = router;

