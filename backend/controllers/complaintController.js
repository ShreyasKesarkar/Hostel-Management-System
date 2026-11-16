/**
 * Complaint Management Controller
 *
 * Handles student grievance reporting, status lifecycle transitions
 * (Pending -> In Progress -> Resolved), and role-based filtering.
 */

const db = require('../database/db');
const { logActivity } = require('../utils/logger');

// GET /api/complaints
// Retrieves complaints: Students only see their own; Admin & Warden see all complaints.
const getAllComplaints = (req, res) => {
  try {
    const { status, category, studentId } = req.query;
    const isStudent = req.user.role === 'student';

    let query = `
      SELECT 
        c.*,
        s.name as student_name,
        s.email as student_email,
        s.phone as student_phone,
        s.department,
        s.year,
        s.enrollment_no,
        r.room_number,
        r.block
      FROM complaints c
      JOIN students s ON c.student_id = s.id
      LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'active'
      LEFT JOIN rooms r ON ra.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    // Enforce role isolation: Students CANNOT see other students' complaints
    if (isStudent) {
      query += ` AND c.student_id = ?`;
      params.push(req.user.studentId);
    } else if (studentId) {
      query += ` AND c.student_id = ?`;
      params.push(parseInt(studentId, 10));
    }

    if (status && status !== 'All') {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    if (category && category !== 'All') {
      query += ` AND c.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY c.created_at DESC`;

    const complaints = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints.'
    });
  }
};

// POST /api/complaints
// Submits a new complaint. Can be submitted by students directly or by staff on behalf of a student.
const createComplaint = (req, res) => {
  try {
    const { title, category, description, student_id } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and description are required.'
      });
    }

    // Determine target student ID based on role
    let targetStudentId = req.user.role === 'student' ? req.user.studentId : student_id;

    if (!targetStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required to file a complaint.'
      });
    }

    // Validate category
    const validCategories = ['Electricity', 'Water', 'Cleaning', 'Internet', 'Furniture', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed: ${validCategories.join(', ')}`
      });
    }

    const insertResult = db.prepare(`
      INSERT INTO complaints (student_id, title, category, description, status)
      VALUES (?, ?, ?, ?, 'Pending')
    `).run(targetStudentId, title.trim(), category, description.trim());

    logActivity(
      req.user.id,
      'Complaint Submitted',
      'Complaints',
      `Filed complaint #${insertResult.lastInsertRowid}: "${title.trim()}" (${category})`
    );

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully. The warden team will look into it shortly.',
      complaintId: insertResult.lastInsertRowid
    });
  } catch (error) {
    console.error('Error submitting complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit complaint. ' + error.message
    });
  }
};

// PUT /api/complaints/:id/status
// Updates the status of a complaint (Pending, In Progress, Resolved) and adds resolution notes
const updateComplaintStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const validStatuses = ['Pending', 'In Progress', 'Resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    db.prepare(`
      UPDATE complaints
      SET status = ?, resolution_notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, resolution_notes ? resolution_notes.trim() : complaint.resolution_notes, id);

    logActivity(
      req.user.id,
      'Complaint Updated',
      'Complaints',
      `Updated Complaint #${id} status to '${status}'`
    );

    return res.json({
      success: true,
      message: `Complaint status updated to '${status}'.`
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint status.'
    });
  }
};

// DELETE /api/complaints/:id
// Deletes a complaint. Students can only delete their own Pending complaints; Admin can delete any.
const deleteComplaint = (req, res) => {
  try {
    const { id } = req.params;

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    if (req.user.role === 'student') {
      if (complaint.student_id !== req.user.studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot delete other students complaints.'
        });
      }
      if (complaint.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete a complaint that is already In Progress or Resolved.'
        });
      }
    }

    db.prepare('DELETE FROM complaints WHERE id = ?').run(id);

    logActivity(req.user.id, 'Complaint Deleted', 'Complaints', `Deleted complaint #${id}`);

    return res.json({
      success: true,
      message: 'Complaint deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete complaint.'
    });
  }
};

module.exports = {
  getAllComplaints,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint
};

