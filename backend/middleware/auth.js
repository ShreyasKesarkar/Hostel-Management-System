/**
 * Authentication and Authorization Middleware
 *
 * This module:
 * 1. Verifies the JSON Web Token (JWT) sent in the HTTP Authorization header.
 * 2. Attaches the authenticated user details (id, username, role, student_id) to req.user.
 * 3. Enforces Role-Based Access Control (RBAC) so only authorized roles can access endpoints.
 */

const jwt = require('jsonwebtoken');
const db = require('../database/db');

// In production, keep this secret in an environment variable (.env).
const JWT_SECRET = process.env.JWT_SECRET || 'hostel_management_super_secret_key_2024';

/**
 * Middleware: Verifies JWT token from Authorization header (Bearer <token>)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }

    // Attach decoded user data
    req.user = decodedUser;

    // If the user is a student, attach their associated student record ID
    if (req.user.role === 'student') {
      const studentRecord = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
      if (studentRecord) {
        req.user.studentId = studentRecord.id;
      }
    }

    next();
  });
}

/**
 * Middleware Factory: Restricts route access to specific user roles
 * Example usage: requireRole('admin', 'warden')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This operation requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};

