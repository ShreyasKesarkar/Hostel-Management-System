/**
 * Fee Routes
 *
 * Routes for viewing fees, generating fee records, and recording payments.
 */

const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Accessible to all authenticated users (students see only their own)
router.get('/', feeController.getAllFees);
router.get('/:id', feeController.getFeeById);
router.post('/:id/pay', feeController.recordPayment);

// Fee generation is restricted to Admin and Warden
router.post('/generate', requireRole('admin', 'warden'), feeController.generateFeeRecord);

module.exports = router;

