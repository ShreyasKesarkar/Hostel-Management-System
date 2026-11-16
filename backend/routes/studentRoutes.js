/**
 * Student Routes
 *
 * Exposes endpoints for managing student records.
 * Accessible to Admin and Warden. Students can only read their own profile.
 */

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All student routes require authentication
router.use(authenticateToken);

// Accessible to staff and students (students can only see their own profile in getById)
router.get('/', requireRole('admin', 'warden'), studentController.getAllStudents);
router.get('/:id', studentController.getStudentById);

// Creation, editing, and deletion are restricted
router.post('/', requireRole('admin', 'warden'), studentController.createStudent);
router.put('/:id', requireRole('admin', 'warden'), studentController.updateStudent);
router.delete('/:id', requireRole('admin'), studentController.deleteStudent);

module.exports = router;

