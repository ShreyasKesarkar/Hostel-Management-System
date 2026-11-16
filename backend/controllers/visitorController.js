/**
 * Visitor Management Controller
 *
 * Tracks campus and hostel visitors, enforces check-in/out timestamps,
 * pairs visitors with resident students, and provides real-time security tracking.
 */

const db = require('../database/db');
const { logActivity } = require('../utils/logger');

// GET /api/visitors
// Retrieves visitor log: Warden/Admin can view all, filter by Checked In / Checked Out status.
const getAllVisitors = (req, res) => {
  try {
    const { status, studentId, search } = req.query;
    const isStudent = req.user.role === 'student';

    let query = `
      SELECT 
        v.*,
        s.name as student_name,
        s.enrollment_no,
        s.department,
        s.phone as student_phone,
        r.room_number,
        r.block
      FROM visitors v
      JOIN students s ON v.student_id = s.id
      LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'active'
      LEFT JOIN rooms r ON ra.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (isStudent) {
      query += ` AND v.student_id = ?`;
      params.push(req.user.studentId);
    } else if (studentId) {
      query += ` AND v.student_id = ?`;
      params.push(parseInt(studentId, 10));
    }

    if (status && status !== 'All') {
      query += ` AND v.status = ?`;
      params.push(status);
    }

    if (search && search.trim() !== '') {
      query += ` AND (v.visitor_name LIKE ? OR v.visitor_phone LIKE ? OR s.name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY v.check_in DESC`;

    const visitors = db.prepare(query).all(...params);

    // Active currently checked-in count
    const activeCount = db.prepare("SELECT COUNT(*) as count FROM visitors WHERE status = 'Checked In'").get().count;

    return res.json({
      success: true,
      activeCount,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve visitor records.'
    });
  }
};

// POST /api/visitors
// Checks in a new visitor for a host student
const checkInVisitor = (req, res) => {
  try {
    const { student_id, visitor_name, visitor_phone, relationship, id_proof, purpose, check_in } = req.body;

    if (!student_id || !visitor_name || !visitor_phone || !relationship || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Student, visitor name, phone number, relationship, and purpose are required.'
      });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    const checkInTime = check_in || new Date().toISOString().replace('T', ' ').substring(0, 19);

    const insertResult = db.prepare(`
      INSERT INTO visitors (student_id, visitor_name, visitor_phone, relationship, id_proof, check_in, status, purpose)
      VALUES (?, ?, ?, ?, ?, ?, 'Checked In', ?)
    `).run(
      student_id,
      visitor_name.trim(),
      visitor_phone.trim(),
      relationship.trim(),
      id_proof ? id_proof.trim() : null,
      checkInTime,
      purpose.trim()
    );

    logActivity(
      req.user.id,
      'Visitor Check-In',
      'Visitors',
      `Checked in visitor '${visitor_name}' to meet student '${student.name}'`
    );

    return res.status(201).json({
      success: true,
      message: `Visitor '${visitor_name}' checked in successfully.`,
      visitorId: insertResult.lastInsertRowid
    });
  } catch (error) {
    console.error('Error checking in visitor:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check in visitor. ' + error.message
    });
  }
};

// PUT /api/visitors/:id/checkout
// Marks a visitor as Checked Out and sets checkout timestamp
const checkOutVisitor = (req, res) => {
  try {
    const { id } = req.params;
    const { check_out } = req.body;

    const visitor = db.prepare('SELECT * FROM visitors WHERE id = ?').get(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor record not found.'
      });
    }

    if (visitor.status === 'Checked Out') {
      return res.status(400).json({
        success: false,
        message: 'This visitor is already checked out.'
      });
    }

    const checkOutTime = check_out || new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      UPDATE visitors
      SET status = 'Checked Out', check_out = ?
      WHERE id = ?
    `).run(checkOutTime, id);

    logActivity(
      req.user.id,
      'Visitor Check-Out',
      'Visitors',
      `Visitor '${visitor.visitor_name}' checked out.`
    );

    return res.json({
      success: true,
      message: `Visitor '${visitor.visitor_name}' successfully checked out.`
    });
  } catch (error) {
    console.error('Error checking out visitor:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check out visitor.'
    });
  }
};

// DELETE /api/visitors/:id
// Removes visitor log entry (Admin only)
const deleteVisitor = (req, res) => {
  try {
    const { id } = req.params;

    const visitor = db.prepare('SELECT * FROM visitors WHERE id = ?').get(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found.'
      });
    }

    db.prepare('DELETE FROM visitors WHERE id = ?').run(id);

    logActivity(req.user.id, 'Visitor Deleted', 'Visitors', `Deleted visitor record #${id}`);

    return res.json({
      success: true,
      message: 'Visitor record deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting visitor:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete visitor record.'
    });
  }
};

module.exports = {
  getAllVisitors,
  checkInVisitor,
  checkOutVisitor,
  deleteVisitor
};
