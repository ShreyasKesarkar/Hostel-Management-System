/**
 * Room Allocation Controller
 *
 * Core hostel business logic module:
 * 1. Assigns students to rooms while strictly enforcing room capacity limits.
 * 2. Prevents double-allocation of a single student.
 * 3. Handles room transfers with historical audit tracking.
 * 4. Manages bed vacating workflows and updates room statuses.
 */

const db = require('../database/db');
const { logActivity } = require('../utils/logger');

// GET /api/allocations
// Retrieves list of allocations (active or past), with room and student info
const getAllAllocations = (req, res) => {
  try {
    const { status, roomId, studentId } = req.query;

    let query = `
      SELECT 
        ra.*,
        s.name as student_name,
        s.email as student_email,
        s.phone as student_phone,
        s.department,
        s.year,
        s.enrollment_no,
        r.room_number,
        r.block,
        r.floor,
        r.room_type,
        r.capacity
      FROM room_allocations ra
      JOIN students s ON ra.student_id = s.id
      JOIN rooms r ON ra.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ` AND ra.status = ?`;
      params.push(status);
    }

    if (roomId) {
      query += ` AND ra.room_id = ?`;
      params.push(parseInt(roomId, 10));
    }

    if (studentId) {
      query += ` AND ra.student_id = ?`;
      params.push(parseInt(studentId, 10));
    }

    query += ` ORDER BY ra.created_at DESC`;

    const allocations = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: allocations.length,
      data: allocations
    });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve room allocations.'
    });
  }
};

// POST /api/allocations
// Assigns a room to an unallocated student. Strictly validates capacity and duplicate allocation.
const allocateRoom = (req, res) => {
  try {
    const { student_id, room_id, bed_number, allocation_date, remarks } = req.body;

    if (!student_id || !room_id || !allocation_date) {
      return res.status(400).json({
        success: false,
        message: 'Student, room, and allocation date are required.'
      });
    }

    // 1. Verify student exists
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    // 2. Check if student is ALREADY allocated to any room
    const existingActiveAllocation = db.prepare(`
      SELECT ra.*, r.room_number 
      FROM room_allocations ra
      JOIN rooms r ON ra.room_id = r.id
      WHERE ra.student_id = ? AND ra.status = 'active'
    `).get(student_id);

    if (existingActiveAllocation) {
      return res.status(400).json({
        success: false,
        message: `Student '${student.name}' is already actively allocated to Room ${existingActiveAllocation.room_number}. Use Room Transfer if you wish to move them.`
      });
    }

    // 3. Verify room exists and check current capacity
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Target room not found.'
      });
    }

    if (room.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: `Room ${room.room_number} is currently under maintenance and cannot accept new occupants.`
      });
    }

    const currentOccupantsCount = db.prepare(`
      SELECT COUNT(*) as count FROM room_allocations 
      WHERE room_id = ? AND status = 'active'
    `).get(room_id).count;

    // CAPACITY CHECK: Prevent over-allocation!
    if (currentOccupantsCount >= room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Cannot allocate bed. Room ${room.room_number} is already full (Capacity: ${room.capacity}/${room.capacity}).`
      });
    }

    // Determine bed label if not provided (e.g. Bed-1, Bed-2, etc.)
    const assignedBed = bed_number || `Bed-${currentOccupantsCount + 1}`;

    // Perform allocation within transaction
    const allocationTx = db.transaction(() => {
      // Insert allocation record
      const result = db.prepare(`
        INSERT INTO room_allocations (student_id, room_id, bed_number, allocation_date, status, remarks)
        VALUES (?, ?, ?, ?, 'active', ?)
      `).run(
        student_id,
        room_id,
        assignedBed,
        allocation_date,
        remarks || 'Allocated by staff'
      );

      // Update room status to 'full' if capacity is now reached
      if (currentOccupantsCount + 1 >= room.capacity) {
        db.prepare("UPDATE rooms SET status = 'full' WHERE id = ?").run(room_id);
      } else {
        db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(room_id);
      }

      return result.lastInsertRowid;
    });

    const newAllocationId = allocationTx();

    logActivity(
      req.user.id,
      'Room Allocated',
      'Allocations',
      `Assigned student '${student.name}' to Room ${room.room_number} (${assignedBed})`
    );

    return res.status(201).json({
      success: true,
      message: `Student '${student.name}' successfully allocated to Room ${room.room_number} (${assignedBed}).`,
      allocationId: newAllocationId
    });
  } catch (error) {
    console.error('Error allocating room:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to allocate room. ' + error.message
    });
  }
};

// POST /api/allocations/transfer
// Transfers a student from their current room to a new room
const transferRoom = (req, res) => {
  try {
    const { student_id, new_room_id, new_bed_number, transfer_date, reason } = req.body;

    if (!student_id || !new_room_id || !transfer_date) {
      return res.status(400).json({
        success: false,
        message: 'Student, new room, and transfer date are required.'
      });
    }

    // Find student's current active allocation
    const currentAllocation = db.prepare(`
      SELECT ra.*, r.room_number, r.id as old_room_id, s.name as student_name
      FROM room_allocations ra
      JOIN rooms r ON ra.room_id = r.id
      JOIN students s ON ra.student_id = s.id
      WHERE ra.student_id = ? AND ra.status = 'active'
    `).get(student_id);

    if (!currentAllocation) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer. Student does not currently have an active room allocation.'
      });
    }

    if (currentAllocation.old_room_id === parseInt(new_room_id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Target room is the same as the current room.'
      });
    }

    // Check new room capacity
    const targetRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(new_room_id);
    if (!targetRoom) {
      return res.status(404).json({
        success: false,
        message: 'Target room not found.'
      });
    }

    if (targetRoom.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        message: `Target room ${targetRoom.room_number} is under maintenance.`
      });
    }

    const targetOccupants = db.prepare(`
      SELECT COUNT(*) as count FROM room_allocations 
      WHERE room_id = ? AND status = 'active'
    `).get(new_room_id).count;

    if (targetOccupants >= targetRoom.capacity) {
      return res.status(400).json({
        success: false,
        message: `Cannot transfer. Target Room ${targetRoom.room_number} is already full.`
      });
    }

    const assignedBed = new_bed_number || `Bed-${targetOccupants + 1}`;

    // Execute transfer in a single ACID transaction
    const transferTx = db.transaction(() => {
      // 1. Mark existing allocation as 'transferred' with vacating date
      db.prepare(`
        UPDATE room_allocations
        SET status = 'transferred', vacating_date = ?, remarks = ?
        WHERE id = ?
      `).run(
        transfer_date,
        reason ? `Transferred to ${targetRoom.room_number}: ${reason}` : `Transferred to ${targetRoom.room_number}`,
        currentAllocation.id
      );

      // 2. Insert new active allocation in target room
      const newAlloc = db.prepare(`
        INSERT INTO room_allocations (student_id, room_id, bed_number, allocation_date, status, remarks)
        VALUES (?, ?, ?, ?, 'active', ?)
      `).run(
        student_id,
        new_room_id,
        assignedBed,
        transfer_date,
        reason ? `Transferred from ${currentAllocation.room_number}: ${reason}` : `Transferred from ${currentAllocation.room_number}`
      );

      // 3. Update old room status: it now has one less student, so status is available
      db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(currentAllocation.old_room_id);

      // 4. Update new room status: if capacity reached, set to full
      if (targetOccupants + 1 >= targetRoom.capacity) {
        db.prepare("UPDATE rooms SET status = 'full' WHERE id = ?").run(new_room_id);
      }

      return newAlloc.lastInsertRowid;
    });

    const newAllocationId = transferTx();

    logActivity(
      req.user.id,
      'Room Transferred',
      'Allocations',
      `Transferred student '${currentAllocation.student_name}' from Room ${currentAllocation.room_number} to Room ${targetRoom.room_number}`
    );

    return res.json({
      success: true,
      message: `Student '${currentAllocation.student_name}' successfully transferred to Room ${targetRoom.room_number}.`,
      allocationId: newAllocationId
    });
  } catch (error) {
    console.error('Error transferring room:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to transfer room. ' + error.message
    });
  }
};

// POST /api/allocations/:id/vacate
// Vacates a student from their allocated bed
const vacateRoom = (req, res) => {
  try {
    const { id } = req.params;
    const { vacating_date, remarks } = req.body;

    const allocation = db.prepare(`
      SELECT ra.*, s.name as student_name, r.room_number
      FROM room_allocations ra
      JOIN students s ON ra.student_id = s.id
      JOIN rooms r ON ra.room_id = r.id
      WHERE ra.id = ? AND ra.status = 'active'
    `).get(id);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Active allocation record not found.'
      });
    }

    const vacateTx = db.transaction(() => {
      // 1. Mark allocation as vacated
      db.prepare(`
        UPDATE room_allocations
        SET status = 'vacated', vacating_date = ?, remarks = ?
        WHERE id = ?
      `).run(
        vacating_date || new Date().toISOString().split('T')[0],
        remarks ? remarks.trim() : 'Vacated room',
        id
      );

      // 2. Mark room status as 'available' since a bed is freed
      db.prepare("UPDATE rooms SET status = 'available' WHERE id = ?").run(allocation.room_id);
    });

    vacateTx();

    logActivity(
      req.user.id,
      'Room Vacated',
      'Allocations',
      `Student '${allocation.student_name}' vacated Room ${allocation.room_number}`
    );

    return res.json({
      success: true,
      message: `Student '${allocation.student_name}' successfully vacated Room ${allocation.room_number}.`
    });
  } catch (error) {
    console.error('Error vacating room:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to vacate room. ' + error.message
    });
  }
};

module.exports = {
  getAllAllocations,
  allocateRoom,
  transferRoom,
  vacateRoom
};
