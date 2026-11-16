/**
 * Student Management Controller
 *
 * Provides CRUD operations for student records, handles search and filter,
 * validates duplicate enrollment numbers or emails, and pairs with user logins.
 */

const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { logActivity } = require('../utils/logger');

// GET /api/students
// Retrieves students with their active room allocation details. Supports search and filters.
const getAllStudents = (req, res) => {
  try {
    const { search, department, year, allocationStatus } = req.query;

    let query = `
      SELECT 
        s.*,
        r.room_number,
        r.block,
        r.floor,
        r.room_type,
        ra.bed_number,
        ra.allocation_date,
        ra.id as allocation_id,
        u.username
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'active'
      LEFT JOIN rooms r ON ra.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by search term (name, email, or enrollment number)
    if (search && search.trim() !== '') {
      query += ` AND (s.name LIKE ? OR s.email LIKE ? OR s.enrollment_no LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Filter by department
    if (department && department !== 'All') {
      query += ` AND s.department = ?`;
      params.push(department);
    }

    // Filter by academic year
    if (year && year !== 'All') {
      query += ` AND s.year = ?`;
      params.push(parseInt(year, 10));
    }

    // Filter by room allocation status
    if (allocationStatus === 'allocated') {
      query += ` AND ra.id IS NOT NULL`;
    } else if (allocationStatus === 'unallocated') {
      query += ` AND ra.id IS NULL`;
    }

    query += ` ORDER BY s.name ASC`;

    const students = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve students list.'
    });
  }
};

// GET /api/students/:id
// Returns complete profile of a specific student including rooms, complaints, fees, visitors
const getStudentById = (req, res) => {
  try {
    const { id } = req.params;

    // Students can only view their own profile unless the user is Admin or Warden
    if (req.user.role === 'student' && req.user.studentId !== parseInt(id, 10)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own student record.'
      });
    }

    const student = db.prepare(`
      SELECT 
        s.*,
        r.room_number, r.block, r.floor, r.room_type, r.fee_per_semester,
        ra.bed_number, ra.allocation_date, ra.id as allocation_id,
        u.username
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'active'
      LEFT JOIN rooms r ON ra.room_id = r.id
      WHERE s.id = ?
    `).get(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    // Fetch related records
    const complaints = db.prepare('SELECT * FROM complaints WHERE student_id = ? ORDER BY created_at DESC').all(id);
    const fees = db.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY created_at DESC').all(id);
    const visitors = db.prepare('SELECT * FROM visitors WHERE student_id = ? ORDER BY check_in DESC').all(id);
    const allocationHistory = db.prepare(`
      SELECT ra.*, r.room_number, r.block
      FROM room_allocations ra
      JOIN rooms r ON ra.room_id = r.id
      WHERE ra.student_id = ?
      ORDER BY ra.allocation_date DESC
    `).all(id);

    return res.json({
      success: true,
      data: {
        ...student,
        complaints,
        fees,
        visitors,
        allocationHistory
      }
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student details.'
    });
  }
};

// POST /api/students
// Adds a new student record and automatically creates their login credentials
const createStudent = (req, res) => {
  try {
    const {
      name, email, phone, department, year,
      enrollment_no, guardian_name, guardian_phone,
      address, blood_group, password
    } = req.body;

    // Field validations
    if (!name || !email || !phone || !department || !year || !enrollment_no) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, department, year, and enrollment number.'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Check for duplicate enrollment number
    const existingEnrollment = db.prepare('SELECT id FROM students WHERE enrollment_no = ?').get(enrollment_no.trim());
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: `A student with enrollment number '${enrollment_no}' already exists.`
      });
    }

    // Check for duplicate email
    const existingEmail = db.prepare('SELECT id FROM students WHERE email = ?').get(email.trim().toLowerCase());
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `A student with email '${email}' already exists.`
      });
    }

    // Generate unique username based on enrollment number or name
    const username = enrollment_no.trim().toLowerCase();
    const rawPassword = password || 'password123'; // Default password for new student
    const hashedPassword = bcrypt.hashSync(rawPassword, 10);

    // Run in transaction: create user login first, then student record
    const insertTransaction = db.transaction(() => {
      // 1. Insert user
      const userResult = db.prepare(`
        INSERT INTO users (username, password, email, role, full_name, phone)
        VALUES (?, ?, ?, 'student', ?, ?)
      `).run(
        username,
        hashedPassword,
        email.trim().toLowerCase(),
        name.trim(),
        phone.trim()
      );

      const newUserId = userResult.lastInsertRowid;

      // 2. Insert student record
      const studentResult = db.prepare(`
        INSERT INTO students (
          user_id, name, email, phone, department, year,
          enrollment_no, guardian_name, guardian_phone, address, blood_group
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newUserId,
        name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        department.trim(),
        parseInt(year, 10),
        enrollment_no.trim().toUpperCase(),
        guardian_name ? guardian_name.trim() : null,
        guardian_phone ? guardian_phone.trim() : null,
        address ? address.trim() : null,
        blood_group ? blood_group.trim() : null
      );

      return studentResult.lastInsertRowid;
    });

    const newStudentId = insertTransaction();

    logActivity(
      req.user.id,
      'Student Added',
      'Students',
      `Added new student '${name}' (${enrollment_no.toUpperCase()})`
    );

    return res.status(201).json({
      success: true,
      message: `Student '${name}' added successfully. Initial login username is '${username}'.`,
      studentId: newStudentId
    });
  } catch (error) {
    console.error('Error creating student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create student record. ' + error.message
    });
  }
};

// PUT /api/students/:id
// Updates an existing student record
const updateStudent = (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, department, year,
      enrollment_no, guardian_name, guardian_phone,
      address, blood_group
    } = req.body;

    if (!name || !email || !phone || !department || !year || !enrollment_no) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, department, year, and enrollment number are required.'
      });
    }

    const currentStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!currentStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    // Check duplicate enrollment number if changed
    if (enrollment_no.trim().toUpperCase() !== currentStudent.enrollment_no) {
      const duplicateEnrollment = db.prepare('SELECT id FROM students WHERE enrollment_no = ? AND id != ?').get(enrollment_no.trim().toUpperCase(), id);
      if (duplicateEnrollment) {
        return res.status(400).json({
          success: false,
          message: `Enrollment number '${enrollment_no}' is already used by another student.`
        });
      }
    }

    // Check duplicate email if changed
    if (email.trim().toLowerCase() !== currentStudent.email.toLowerCase()) {
      const duplicateEmail = db.prepare('SELECT id FROM students WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), id);
      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: `Email '${email}' is already registered with another student.`
        });
      }
    }

    // Update student
    db.prepare(`
      UPDATE students
      SET name = ?, email = ?, phone = ?, department = ?, year = ?,
          enrollment_no = ?, guardian_name = ?, guardian_phone = ?,
          address = ?, blood_group = ?
      WHERE id = ?
    `).run(
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      department.trim(),
      parseInt(year, 10),
      enrollment_no.trim().toUpperCase(),
      guardian_name ? guardian_name.trim() : null,
      guardian_phone ? guardian_phone.trim() : null,
      address ? address.trim() : null,
      blood_group ? blood_group.trim() : null,
      id
    );

    // Also update name/email/phone on the linked user record if it exists
    if (currentStudent.user_id) {
      db.prepare(`
        UPDATE users
        SET full_name = ?, email = ?, phone = ?
        WHERE id = ?
      `).run(name.trim(), email.trim().toLowerCase(), phone.trim(), currentStudent.user_id);
    }

    logActivity(req.user.id, 'Student Updated', 'Students', `Updated student profile for '${name}' (${enrollment_no})`);

    return res.json({
      success: true,
      message: 'Student record updated successfully.'
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student record.'
    });
  }
};

// DELETE /api/students/:id
// Removes a student record, frees up their allocated bed, and deletes linked user account
const deleteStudent = (req, res) => {
  try {
    const { id } = req.params;

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    // Check if student has an active room allocation
    const activeAllocation = db.prepare("SELECT room_id FROM room_allocations WHERE student_id = ? AND status = 'active'").get(id);

    // Delete in transaction to preserve database integrity
    const deleteTransaction = db.transaction(() => {
      // 1. Delete student (cascades to complaints, fees, visitors, allocations due to foreign key)
      db.prepare('DELETE FROM students WHERE id = ?').run(id);

      // 2. Delete linked user account if exists
      if (student.user_id) {
        db.prepare('DELETE FROM users WHERE id = ?').run(student.user_id);
      }

      // 3. Update room status if a bed was freed
      if (activeAllocation) {
        const remainingCount = db.prepare("SELECT COUNT(*) as count FROM room_allocations WHERE room_id = ? AND status = 'active'").get(activeAllocation.room_id).count;
        const room = db.prepare('SELECT capacity FROM rooms WHERE id = ?').get(activeAllocation.room_id);
        if (room && remainingCount < room.capacity) {
          db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(activeAllocation.room_id);
        }
      }
    });

    deleteTransaction();

    logActivity(req.user.id, 'Student Removed', 'Students', `Removed student '${student.name}' (${student.enrollment_no})`);

    return res.json({
      success: true,
      message: `Student '${student.name}' has been deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete student. ' + error.message
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};
