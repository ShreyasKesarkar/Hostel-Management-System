/**
 * Fee Management Controller
 *
 * Manages hostel fee invoices, payment processing (simulated for academic demo),
 * payment tracking, and status calculations (Pending, Partially Paid, Paid).
 */

const db = require('../database/db');
const { logActivity } = require('../utils/logger');

// GET /api/fees
// Retrieves fee invoices: Students view only their own records; Staff view all.
const getAllFees = (req, res) => {
  try {
    const { status, semester, studentId } = req.query;
    const isStudent = req.user.role === 'student';

    let query = `
      SELECT 
        f.*,
        (f.total_amount - f.paid_amount) as pending_amount,
        s.name as student_name,
        s.email as student_email,
        s.phone as student_phone,
        s.enrollment_no,
        s.department,
        s.year,
        r.room_number,
        r.block
      FROM fees f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.status = 'active'
      LEFT JOIN rooms r ON ra.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (isStudent) {
      query += ` AND f.student_id = ?`;
      params.push(req.user.studentId);
    } else if (studentId) {
      query += ` AND f.student_id = ?`;
      params.push(parseInt(studentId, 10));
    }

    if (status && status !== 'All') {
      query += ` AND f.status = ?`;
      params.push(status);
    }

    if (semester && semester !== 'All') {
      query += ` AND f.semester = ?`;
      params.push(semester);
    }

    query += ` ORDER BY f.created_at DESC`;

    const fees = db.prepare(query).all(...params);

    // Compute overall summary totals
    let totalReceivable = 0;
    let totalCollected = 0;
    let totalPending = 0;

    fees.forEach(f => {
      totalReceivable += f.total_amount;
      totalCollected += f.paid_amount;
      totalPending += (f.total_amount - f.paid_amount);
    });

    return res.json({
      success: true,
      summary: {
        totalReceivable,
        totalCollected,
        totalPending
      },
      count: fees.length,
      data: fees
    });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve fee records.'
    });
  }
};

// GET /api/fees/:id
// Retrieves a single fee invoice with its full list of payment transactions
const getFeeById = (req, res) => {
  try {
    const { id } = req.params;

    const fee = db.prepare(`
      SELECT 
        f.*,
        (f.total_amount - f.paid_amount) as pending_amount,
        s.name as student_name,
        s.email as student_email,
        s.phone as student_phone,
        s.enrollment_no,
        s.department,
        s.year
      FROM fees f
      JOIN students s ON f.student_id = s.id
      WHERE f.id = ?
    `).get(id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee invoice not found.'
      });
    }

    // Role check: student can only view their own
    if (req.user.role === 'student' && fee.student_id !== req.user.studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    // Fetch payments for this fee
    const payments = db.prepare(`
      SELECT * FROM payments 
      WHERE fee_id = ? 
      ORDER BY payment_date DESC
    `).all(id);

    return res.json({
      success: true,
      data: {
        ...fee,
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching fee details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve fee details.'
    });
  }
};

// POST /api/fees/generate
// Generates fee records for a single student or all students (Admin/Warden)
const generateFeeRecord = (req, res) => {
  try {
    const { student_id, semester, academic_year, total_amount, due_date, apply_to_all } = req.body;

    if (!semester || !academic_year || !total_amount) {
      return res.status(400).json({
        success: false,
        message: 'Semester, academic year, and fee amount are required.'
      });
    }

    const amount = parseFloat(total_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Fee amount must be a positive number.'
      });
    }

    // Bulk generation for all students
    if (apply_to_all) {
      const allStudents = db.prepare('SELECT id, name FROM students').all();
      if (allStudents.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No students found in the database.'
        });
      }

      const insertStmt = db.prepare(`
        INSERT INTO fees (student_id, semester, academic_year, total_amount, paid_amount, status, due_date)
        VALUES (?, ?, ?, ?, 0, 'Pending', ?)
      `);

      const generateAllTx = db.transaction(() => {
        let count = 0;
        for (const st of allStudents) {
          // Check if invoice already exists for this semester
          const exists = db.prepare('SELECT id FROM fees WHERE student_id = ? AND semester = ? AND academic_year = ?').get(st.id, semester, academic_year);
          if (!exists) {
            insertStmt.run(st.id, semester, academic_year, amount, due_date || null);
            count++;
          }
        }
        return count;
      });

      const generatedCount = generateAllTx();

      logActivity(
        req.user.id,
        'Bulk Fees Generated',
        'Fees',
        `Generated ${generatedCount} fee records for ${semester} (${academic_year})`
      );

      return res.status(201).json({
        success: true,
        message: `Successfully generated fee records for ${generatedCount} students for ${semester}.`
      });
    }

    // Single student generation
    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required when generating fee for a single student.'
      });
    }

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    const existing = db.prepare(`
      SELECT id FROM fees 
      WHERE student_id = ? AND semester = ? AND academic_year = ?
    `).get(student_id, semester, academic_year);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A fee record already exists for ${student.name} for ${semester} (${academic_year}).`
      });
    }

    const insertResult = db.prepare(`
      INSERT INTO fees (student_id, semester, academic_year, total_amount, paid_amount, status, due_date)
      VALUES (?, ?, ?, ?, 0, 'Pending', ?)
    `).run(student_id, semester, academic_year, amount, due_date || null);

    logActivity(
      req.user.id,
      'Fee Generated',
      'Fees',
      `Generated fee of ₹${amount} for student '${student.name}' (${semester})`
    );

    return res.status(201).json({
      success: true,
      message: `Fee record generated successfully for ${student.name}.`,
      feeId: insertResult.lastInsertRowid
    });
  } catch (error) {
    console.error('Error generating fee record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate fee record. ' + error.message
    });
  }
};

// POST /api/fees/:id/pay
// Records a simulated payment transaction for an invoice and recalculates status
const recordPayment = (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, remarks, transaction_reference } = req.body;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid payment amount greater than zero.'
      });
    }

    const fee = db.prepare('SELECT * FROM fees WHERE id = ?').get(id);
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee invoice not found.'
      });
    }

    // Role check: student can only pay their own fee
    if (req.user.role === 'student' && fee.student_id !== req.user.studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const pendingAmount = fee.total_amount - fee.paid_amount;
    if (payAmount > pendingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${payAmount}) exceeds outstanding balance (₹${pendingAmount}).`
      });
    }

    // Generate unique transaction reference if not given
    const txRef = transaction_reference || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const paymentTx = db.transaction(() => {
      // 1. Insert payment record
      const paymentResult = db.prepare(`
        INSERT INTO payments (fee_id, student_id, amount, payment_method, transaction_reference, remarks)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        fee.student_id,
        payAmount,
        payment_method || 'UPI',
        txRef,
        remarks || 'Simulated academic payment'
      );

      // 2. Update fee record
      const newPaidAmount = fee.paid_amount + payAmount;
      let newStatus = 'Partially Paid';
      if (newPaidAmount >= fee.total_amount) {
        newStatus = 'Paid';
      }

      db.prepare(`
        UPDATE fees 
        SET paid_amount = ?, status = ?
        WHERE id = ?
      `).run(newPaidAmount, newStatus, id);

      return { paymentId: paymentResult.lastInsertRowid, newPaidAmount, newStatus, txRef };
    });

    const result = paymentTx();

    const student = db.prepare('SELECT name FROM students WHERE id = ?').get(fee.student_id);

    logActivity(
      req.user.id,
      'Fee Payment Received',
      'Fees',
      `Payment of ₹${payAmount} recorded for student '${student ? student.name : 'Unknown'}' (Ref: ${result.txRef})`
    );

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${payAmount} recorded successfully. Status is now '${result.newStatus}'.`,
      paymentId: result.paymentId,
      transactionReference: result.txRef,
      newStatus: result.newStatus,
      paidAmount: result.newPaidAmount,
      remainingAmount: fee.total_amount - result.newPaidAmount
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record payment. ' + error.message
    });
  }
};

module.exports = {
  getAllFees,
  getFeeById,
  generateFeeRecord,
  recordPayment
};

