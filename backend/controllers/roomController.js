/**
 * Room Management Controller
 *
 * Handles creation, modification, deletion, and query of hostel rooms.
 * Dynamically computes occupied and available beds from active allocations.
 */

const db = require('../database/db');
const { logActivity } = require('../utils/logger');

// GET /api/rooms
// Retrieves rooms with dynamically calculated occupied and available bed counts
const getAllRooms = (req, res) => {
  try {
    const { block, floor, room_type, status } = req.query;

    let query = `
      SELECT 
        r.*,
        COUNT(CASE WHEN ra.status = 'active' THEN 1 END) as occupied_beds,
        (r.capacity - COUNT(CASE WHEN ra.status = 'active' THEN 1 END)) as available_beds
      FROM rooms r
      LEFT JOIN room_allocations ra ON r.id = ra.room_id AND ra.status = 'active'
      WHERE 1=1
    `;
    const params = [];

    if (block && block !== 'All') {
      query += ` AND r.block = ?`;
      params.push(block);
    }

    if (floor && floor !== 'All') {
      query += ` AND r.floor = ?`;
      params.push(parseInt(floor, 10));
    }

    if (room_type && room_type !== 'All') {
      query += ` AND r.room_type = ?`;
      params.push(room_type);
    }

    if (status && status !== 'All') {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    query += ` GROUP BY r.id ORDER BY r.block ASC, r.room_number ASC`;

    const rooms = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rooms.'
    });
  }
};

// GET /api/rooms/:id
// Retrieves room details along with list of currently allocated student occupants
const getRoomById = (req, res) => {
  try {
    const { id } = req.params;

    const room = db.prepare(`
      SELECT 
        r.*,
        COUNT(CASE WHEN ra.status = 'active' THEN 1 END) as occupied_beds,
        (r.capacity - COUNT(CASE WHEN ra.status = 'active' THEN 1 END)) as available_beds
      FROM rooms r
      LEFT JOIN room_allocations ra ON r.id = ra.room_id AND ra.status = 'active'
      WHERE r.id = ?
      GROUP BY r.id
    `).get(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Fetch active student occupants
    const occupants = db.prepare(`
      SELECT 
        s.id as student_id,
        s.name,
        s.email,
        s.phone,
        s.enrollment_no,
        s.department,
        s.year,
        ra.id as allocation_id,
        ra.bed_number,
        ra.allocation_date
      FROM room_allocations ra
      JOIN students s ON ra.student_id = s.id
      WHERE ra.room_id = ? AND ra.status = 'active'
      ORDER BY ra.bed_number ASC
    `).all(id);

    // Fetch maintenance history for this room
    const maintenance = db.prepare(`
      SELECT * FROM maintenance_requests
      WHERE room_id = ?
      ORDER BY reported_date DESC
    `).all(id);

    return res.json({
      success: true,
      data: {
        ...room,
        occupants,
        maintenance
      }
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve room details.'
    });
  }
};

// POST /api/rooms
// Adds a new room to the hostel inventory
const createRoom = (req, res) => {
  try {
    const { room_number, block, floor, room_type, capacity, fee_per_semester, status } = req.body;

    if (!room_number || !block || floor === undefined || !room_type || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Room number, block, floor, room type, and capacity are required.'
      });
    }

    const parsedCapacity = parseInt(capacity, 10);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Room capacity must be a positive integer.'
      });
    }

    // Check duplicate room number
    const existing = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(room_number.trim().toUpperCase());
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Room '${room_number}' already exists.`
      });
    }

    const insertResult = db.prepare(`
      INSERT INTO rooms (room_number, block, floor, room_type, capacity, fee_per_semester, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      room_number.trim().toUpperCase(),
      block.trim().toUpperCase(),
      parseInt(floor, 10),
      room_type,
      parsedCapacity,
      parseFloat(fee_per_semester) || 15000,
      status || 'available'
    );

    logActivity(req.user.id, 'Room Created', 'Rooms', `Created Room ${room_number.toUpperCase()} in Block ${block.toUpperCase()} (Capacity: ${parsedCapacity})`);

    return res.status(201).json({
      success: true,
      message: `Room ${room_number.toUpperCase()} created successfully.`,
      roomId: insertResult.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create room. ' + error.message
    });
  }
};

// PUT /api/rooms/:id
// Modifies room configuration (capacity, type, fee, status)
const updateRoom = (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, block, floor, room_type, capacity, fee_per_semester, status } = req.body;

    const existingRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    const parsedCapacity = parseInt(capacity, 10);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Room capacity must be a positive integer.'
      });
    }

    // Validate that new capacity is not less than currently allocated students
    const activeAllocationsCount = db.prepare("SELECT COUNT(*) as count FROM room_allocations WHERE room_id = ? AND status = 'active'").get(id).count;
    if (parsedCapacity < activeAllocationsCount) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce room capacity to ${parsedCapacity}. There are currently ${activeAllocationsCount} active students in this room.`
      });
    }

    // Check duplicate room number if changed
    if (room_number.trim().toUpperCase() !== existingRoom.room_number) {
      const duplicate = db.prepare('SELECT id FROM rooms WHERE room_number = ? AND id != ?').get(room_number.trim().toUpperCase(), id);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Room number '${room_number}' already exists.`
        });
      }
    }

    // If room is full, ensure status reflects full
    let finalStatus = status || existingRoom.status;
    if (activeAllocationsCount >= parsedCapacity && finalStatus === 'available') {
      finalStatus = 'full';
    } else if (activeAllocationsCount < parsedCapacity && finalStatus === 'full') {
      finalStatus = 'available';
    }

    db.prepare(`
      UPDATE rooms
      SET room_number = ?, block = ?, floor = ?, room_type = ?, capacity = ?, fee_per_semester = ?, status = ?
      WHERE id = ?
    `).run(
      room_number.trim().toUpperCase(),
      block.trim().toUpperCase(),
      parseInt(floor, 10),
      room_type,
      parsedCapacity,
      parseFloat(fee_per_semester) || existingRoom.fee_per_semester,
      finalStatus,
      id
    );

    logActivity(req.user.id, 'Room Updated', 'Rooms', `Updated configuration for Room ${room_number.toUpperCase()}`);

    return res.json({
      success: true,
      message: 'Room updated successfully.'
    });
  } catch (error) {
    console.error('Error updating room:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update room.'
    });
  }
};

// DELETE /api/rooms/:id
// Removes a room only if no students are actively allocated
const deleteRoom = (req, res) => {
  try {
    const { id } = req.params;

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Check if any student is currently living in this room
    const activeAllocations = db.prepare("SELECT COUNT(*) as count FROM room_allocations WHERE room_id = ? AND status = 'active'").get(id).count;
    if (activeAllocations > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Room ${room.room_number}. There are currently ${activeAllocations} students allocated to this room. Please vacate or transfer them first.`
      });
    }

    // Safe to delete (allocations history remains or is deleted)
    db.prepare('DELETE FROM rooms WHERE id = ?').run(id);

    logActivity(req.user.id, 'Room Deleted', 'Rooms', `Deleted Room ${room.room_number}`);

    return res.json({
      success: true,
      message: `Room ${room.room_number} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete room. ' + error.message
    });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
};
