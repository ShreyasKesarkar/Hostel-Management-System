/**
 * Maintenance Management Controller
 *
 * Tracks facilities repair requests, technician assignments, repair costs,
 * and completion dates.
 */

const db = require('../database/db');
const { logActivity } = require('../utils/logger');

// GET /api/maintenance
// Retrieves maintenance tickets. Can filter by status and room.
const getAllMaintenance = (req, res) => {
  try {
    const { status, roomId } = req.query;

    let query = `
      SELECT 
        m.*,
        r.room_number,
        r.block,
        r.floor,
        r.room_type
      FROM maintenance_requests m
      JOIN rooms r ON m.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    if (roomId) {
      query += ` AND m.room_id = ?`;
      params.push(parseInt(roomId, 10));
    }

    query += ` ORDER BY m.created_at DESC`;

    const requests = db.prepare(query).all(...params);

    // Calculate aggregated maintenance expenses
    const costSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(cost), 0) as totalCost,
        COUNT(*) as totalRequests,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgressCount,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedCount
      FROM maintenance_requests
    `).get();

    return res.json({
      success: true,
      summary: costSummary,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance records.'
    });
  }
};

// POST /api/maintenance
// Reports a new room maintenance issue
const createMaintenance = (req, res) => {
  try {
    const { room_id, issue_type, description, reported_by, assigned_to, cost, set_room_maintenance } = req.body;

    if (!room_id || !issue_type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Room, issue type, and description are required.'
      });
    }

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    const reporter = reported_by || req.user.fullName || req.user.username;
    const reportedDate = new Date().toISOString().split('T')[0];
    const initialCost = parseFloat(cost) || 0;

    const maintenanceTx = db.transaction(() => {
      // 1. Insert maintenance ticket
      const insertResult = db.prepare(`
        INSERT INTO maintenance_requests (room_id, issue_type, description, reported_by, assigned_to, cost, status, reported_date)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
      `).run(
        room_id,
        issue_type.trim(),
        description.trim(),
        reporter.trim(),
        assigned_to ? assigned_to.trim() : null,
        initialCost,
        reportedDate
      );

      // 2. If room needs to be taken offline into maintenance mode
      if (set_room_maintenance) {
        db.prepare("UPDATE rooms SET status = 'maintenance' WHERE id = ?").run(room_id);
      }

      return insertResult.lastInsertRowid;
    });

    const newRequestId = maintenanceTx();

    logActivity(
      req.user.id,
      'Maintenance Reported',
      'Maintenance',
      `Reported ${issue_type} issue in Room ${room.room_number}`
    );

    return res.status(201).json({
      success: true,
      message: `Maintenance request created for Room ${room.room_number}.`,
      requestId: newRequestId
    });
  } catch (error) {
    console.error('Error creating maintenance ticket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create maintenance ticket. ' + error.message
    });
  }
};

// PUT /api/maintenance/:id
// Updates maintenance task status, technician assignment, final repair cost, and completion date
const updateMaintenance = (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, cost, status, completed_date, restore_room_status } = req.body;

    const existing = db.prepare('SELECT * FROM maintenance_requests WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance ticket not found.'
      });
    }

    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    const newStatus = status || existing.status;
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    let finalCompletedDate = completed_date || existing.completed_date;
    if (newStatus === 'Completed' && !finalCompletedDate) {
      finalCompletedDate = new Date().toISOString().split('T')[0];
    }

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE maintenance_requests
        SET assigned_to = ?, cost = ?, status = ?, completed_date = ?
        WHERE id = ?
      `).run(
        assigned_to !== undefined ? (assigned_to ? assigned_to.trim() : null) : existing.assigned_to,
        cost !== undefined ? parseFloat(cost) : existing.cost,
        newStatus,
        finalCompletedDate,
        id
      );

      // If completing and requested to restore room status
      if (newStatus === 'Completed' && restore_room_status) {
        const room = db.prepare('SELECT capacity FROM rooms WHERE id = ?').get(existing.room_id);
        const activeOccupants = db.prepare("SELECT COUNT(*) as count FROM room_allocations WHERE room_id = ? AND status = 'active'").get(existing.room_id).count;
        const restoredStatus = activeOccupants >= room.capacity ? 'full' : 'available';
        db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(restoredStatus, existing.room_id);
      }
    });

    updateTx();

    logActivity(
      req.user.id,
      'Maintenance Updated',
      'Maintenance',
      `Updated Maintenance #${id} status to '${newStatus}'`
    );

    return res.json({
      success: true,
      message: `Maintenance request #${id} updated successfully.`
    });
  } catch (error) {
    console.error('Error updating maintenance ticket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update maintenance ticket.'
    });
  }
};

// DELETE /api/maintenance/:id
// Removes a maintenance record (Admin only)
const deleteMaintenance = (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM maintenance_requests WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance ticket not found.'
      });
    }

    db.prepare('DELETE FROM maintenance_requests WHERE id = ?').run(id);

    logActivity(req.user.id, 'Maintenance Deleted', 'Maintenance', `Deleted maintenance ticket #${id}`);

    return res.json({
      success: true,
      message: 'Maintenance record deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting maintenance ticket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete maintenance record.'
    });
  }
};

module.exports = {
  getAllMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance
};
