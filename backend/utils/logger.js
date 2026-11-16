/**
 * Activity Logger Utility
 *
 * Records user actions and system events into the activity_logs table in SQLite.
 * This provides an audit trail for room allocations, status updates, fee collections, etc.
 */

const db = require('../database/db');

/**
 * Log an action into the activity_logs table
 * @param {number|null} userId - ID of the user performing the action (or null for system actions)
 * @param {string} action - Short action name (e.g., 'Student Added', 'Fee Paid')
 * @param {string} module - Functional module ('Students', 'Rooms', 'Complaints', 'Fees', 'Visitors', 'Maintenance')
 * @param {string} details - Detailed description of what occurred
 * @param {string} [ipAddress] - Optional client IP address
 */
function logActivity(userId, action, module, details, ipAddress = '127.0.0.1') {
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_logs (user_id, action, module, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId || null, action, module, details, ipAddress);
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = { logActivity };

