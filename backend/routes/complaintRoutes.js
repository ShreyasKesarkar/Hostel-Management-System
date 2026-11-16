/**
 * Complaint Routes
 *
 * Routes for submitting and tracking complaints.
 */

const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Accessible to all authenticated users (students see only their own)
router.get('/', complaintController.getAllComplaints);
router.post('/', complaintController.createComplaint);
router.delete('/:id', complaintController.deleteComplaint);

// Updating status requires Warden or Admin role
router.put('/:id/status', requireRole('admin', 'warden'), complaintController.updateComplaintStatus);

module.exports = router;

