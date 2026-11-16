/**
 * Dashboard Controller
 *
 * Calculates real-time statistics directly from SQLite database tables.
 * Adapts metrics dynamically depending on whether an Admin/Warden or Student is logged in.
 */

const db = require('../database/db');

// GET /api/dashboard/stats
// Returns comprehensive hostel metrics and recent audit activity logs
const getDashboardStats = (req, res) => {
  try {
    const userRole = req.user.role;

    // Student View: Personalized dashboard stats
    if (userRole === 'student') {
      const studentId = req.user.studentId;

      if (!studentId) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not associated with this account.'
        });
      }

      // Fetch student's assigned room and bed details
      const roomInfo = db.prepare(`
        SELECT r.room_number, r.block, r.floor, r.room_type, r.fee_per_semester,
               ra.bed_number, ra.allocation_date
        FROM room_allocations ra
        JOIN rooms r ON ra.room_id = r.id
        WHERE ra.student_id = ? AND ra.status = 'active'
      `).get(studentId);

      // Roommates in the same room
      let roommates = [];
      if (roomInfo) {
        roommates = db.prepare(`
          SELECT s.name, s.department, s.year, ra.bed_number
          FROM room_allocations ra
          JOIN students s ON ra.student_id = s.id
          JOIN rooms r ON ra.room_id = r.id
          WHERE r.room_number = ? AND ra.status = 'active' AND s.id != ?
        `).all(roomInfo.room_number, studentId);
      }

      // Student complaint counts
      const complaintsSummary = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
        FROM complaints WHERE student_id = ?
      `).get(studentId);

      // Student fee summary
      const feeSummary = db.prepare(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as totalDue,
          COALESCE(SUM(paid_amount), 0) as totalPaid,
          COALESCE(SUM(total_amount - paid_amount), 0) as totalPending,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingCount
        FROM fees WHERE student_id = ?
      `).get(studentId);

      // Student active visitor count
      const activeVisitors = db.prepare(`
        SELECT COUNT(*) as count FROM visitors 
        WHERE student_id = ? AND status = 'Checked In'
      `).get(studentId).count;

      // Student recent complaints
      const recentComplaints = db.prepare(`
        SELECT id, title, category, status, created_at
        FROM complaints
        WHERE student_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(studentId);

      return res.json({
        success: true,
        role: 'student',
        data: {
          roomInfo: roomInfo || null,
          roommates,
          complaints: {
            total: complaintsSummary.total || 0,
            pending: complaintsSummary.pending || 0,
            inProgress: complaintsSummary.in_progress || 0,
            resolved: complaintsSummary.resolved || 0
          },
          fees: feeSummary,
          activeVisitors,
          recentComplaints
        }
      });
    }

    // Admin & Warden View: Full administrative hostel metrics
    // 1. Room and Bed Metrics
    const roomMetrics = db.prepare(`
      SELECT 
        COUNT(*) as totalRooms,
        COALESCE(SUM(capacity), 0) as totalCapacity
      FROM rooms
    `).get();

    // Calculate occupied beds by counting active room allocations
    const activeAllocationsCount = db.prepare(`
      SELECT COUNT(*) as count FROM room_allocations WHERE status = 'active'
    `).get().count;

    // Count rooms with at least one active allocation
    const occupiedRoomsCount = db.prepare(`
      SELECT COUNT(DISTINCT room_id) as count 
      FROM room_allocations 
      WHERE status = 'active'
    `).get().count;

    const availableRoomsCount = Math.max(0, roomMetrics.totalRooms - occupiedRoomsCount);
    const availableBedsCount = Math.max(0, roomMetrics.totalCapacity - activeAllocationsCount);

    // 2. Student Metrics
    const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;

    // 3. Complaint Metrics
    const complaintMetrics = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
      FROM complaints
    `).get();

    // Complaints categorized by issue type
    const complaintsByCategory = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM complaints
      GROUP BY category
    `).all();

    // 4. Fee Metrics
    const feeMetrics = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalReceivable,
        COALESCE(SUM(paid_amount), 0) as totalCollected,
        COALESCE(SUM(total_amount - paid_amount), 0) as totalPending,
        SUM(CASE WHEN status = 'Pending' OR status = 'Partially Paid' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paidCount
      FROM fees
    `).get();

    // 5. Visitor Metrics
    const activeVisitorsCount = db.prepare(`
      SELECT COUNT(*) as count FROM visitors WHERE status = 'Checked In'
    `).get().count;

    // 6. Maintenance Metrics
    const maintenanceMetrics = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
        COALESCE(SUM(cost), 0) as totalCost
      FROM maintenance_requests
    `).get();

    // 7. Recent Activities (from audit trail table)
    const recentActivities = db.prepare(`
      SELECT a.id, a.action, a.module, a.details, a.created_at,
             COALESCE(u.full_name, 'System') as user_name,
             u.role as user_role
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `).all();

    return res.json({
      success: true,
      role: userRole,
      data: {
        rooms: {
          total: roomMetrics.totalRooms,
          occupied: occupiedRoomsCount,
          available: availableRoomsCount,
          totalCapacity: roomMetrics.totalCapacity,
          occupiedBeds: activeAllocationsCount,
          availableBeds: availableBedsCount,
          occupancyRate: roomMetrics.totalCapacity > 0 
            ? Math.round((activeAllocationsCount / roomMetrics.totalCapacity) * 100) 
            : 0
        },
        students: {
          total: totalStudents,
          allocated: activeAllocationsCount,
          unallocated: Math.max(0, totalStudents - activeAllocationsCount)
        },
        complaints: {
          total: complaintMetrics.total || 0,
          pending: complaintMetrics.pending || 0,
          inProgress: complaintMetrics.in_progress || 0,
          resolved: complaintMetrics.resolved || 0,
          byCategory: complaintsByCategory
        },
        fees: {
          totalReceivable: feeMetrics.totalReceivable || 0,
          totalCollected: feeMetrics.totalCollected || 0,
          totalPending: feeMetrics.totalPending || 0,
          pendingCount: feeMetrics.pendingCount || 0,
          paidCount: feeMetrics.paidCount || 0
        },
        visitors: {
          activeCount: activeVisitorsCount
        },
        maintenance: {
          total: maintenanceMetrics.total || 0,
          pending: maintenanceMetrics.pending || 0,
          inProgress: maintenanceMetrics.in_progress || 0,
          completed: maintenanceMetrics.completed || 0,
          totalCost: maintenanceMetrics.totalCost || 0
        },
        recentActivities
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics.'
    });
  }
};

module.exports = {
  getDashboardStats
};

