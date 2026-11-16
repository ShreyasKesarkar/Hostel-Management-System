/**
 * Authentication Controller
 *
 * Handles user login, profile fetching, profile updates, and password changes.
 * Passwords are encrypted using bcryptjs, and sessions are secured using JWT tokens.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// POST /api/auth/login
// Authenticates user credentials and returns a signed JWT token with user details
const login = (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate that required fields are provided
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    // Look up user by username or email
    const user = db.prepare(`
      SELECT * FROM users WHERE username = ? OR email = ?
    `).get(username.trim(), username.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User does not exist.'
      });
    }

    // Compare supplied password with bcrypt hashed password in database
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password is incorrect.'
      });
    }

    // If the user is a student, fetch their student record details
    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = db.prepare(`
        SELECT s.*, 
               r.room_number, r.block, r.floor, r.room_type,
               ra.bed_number, ra.allocation_date
        FROM students s
        LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'active'
        LEFT JOIN rooms r ON ra.room_id = r.id
        WHERE s.user_id = ?
      `).get(user.id);
    }

    // Generate JWT token valid for 24 hours
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Record login activity in audit logs
    logActivity(user.id, 'User Login', 'Auth', `User '${user.username}' logged in successfully.`);

    // Return token and sanitized user profile (never expose password hash)
    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        studentId: studentProfile ? studentProfile.id : null,
        studentProfile: studentProfile || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.'
    });
  }
};

// GET /api/auth/me
// Returns current authenticated user's profile and linked student details
const getCurrentUser = (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, role, full_name, phone, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = db.prepare(`
        SELECT s.*, 
               r.room_number, r.block, r.floor, r.room_type,
               ra.bed_number, ra.allocation_date
        FROM students s
        LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'active'
        LEFT JOIN rooms r ON ra.room_id = r.id
        WHERE s.user_id = ?
      `).get(user.id);
    }

    return res.json({
      success: true,
      user: {
        ...user,
        studentId: studentProfile ? studentProfile.id : null,
        studentProfile
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.'
    });
  }
};

// PUT /api/auth/profile
// Updates current user's personal details (name, phone)
const updateProfile = (req, res) => {
  try {
    const { fullName, phone } = req.body;
    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Full name cannot be empty.'
      });
    }

    db.prepare(`
      UPDATE users 
      SET full_name = ?, phone = ?
      WHERE id = ?
    `).run(fullName.trim(), phone ? phone.trim() : null, req.user.id);

    // If user is a student, also update the student table's name and phone
    if (req.user.role === 'student') {
      db.prepare(`
        UPDATE students
        SET name = ?, phone = ?
        WHERE user_id = ?
      `).run(fullName.trim(), phone ? phone.trim() : '', req.user.id);
    }

    logActivity(req.user.id, 'Profile Updated', 'Auth', `User '${req.user.username}' updated profile.`);

    return res.json({
      success: true,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.'
    });
  }
};

// PUT /api/auth/change-password
// Allows user to update their login password after verifying their old password
const changePassword = (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Retrieve user's existing hashed password
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);

    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Hash the new password and update
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedNewPassword, req.user.id);

    logActivity(req.user.id, 'Password Changed', 'Auth', 'User changed account password.');

    return res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password.'
    });
  }
};

module.exports = {
  login,
  getCurrentUser,
  updateProfile,
  changePassword
};

