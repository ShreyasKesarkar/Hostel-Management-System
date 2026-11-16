/**
 * Database Connection and Initialization Module
 *
 * This module establishes the connection to SQLite using better-sqlite3,
 * ensures foreign key integrity, creates all required relational tables,
 * and populates realistic demo data on first startup.
 *
 * Database file location: backend/database/hostel.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure the database directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'hostel.db');

// Connect to SQLite database file
const db = new Database(dbPath, {
  // verbose: console.log // Uncomment for SQL debugging if needed
});

// Enable SQLite Write-Ahead Logging (WAL) for superior concurrency and reliability
db.pragma('journal_mode = WAL');

// Crucial: SQLite disables foreign key enforcement by default, so we explicitly turn it ON
db.pragma('foreign_keys = ON');

/**
 * Initializes database tables if they do not exist
 */
function initializeDatabase() {
  // 1. Users Table (Authentication and role management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'warden', 'student')),
      full_name TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Students Table (Detailed student profiles linked to users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      department TEXT NOT NULL,
      year INTEGER NOT NULL,
      enrollment_no TEXT NOT NULL UNIQUE,
      guardian_name TEXT,
      guardian_phone TEXT,
      address TEXT,
      blood_group TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 3. Rooms Table (Hostel room configuration and capacities)
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL UNIQUE,
      block TEXT NOT NULL,
      floor INTEGER NOT NULL,
      room_type TEXT NOT NULL CHECK(room_type IN ('Single', 'Double', 'Triple', 'Four-Bed')),
      capacity INTEGER NOT NULL CHECK(capacity > 0),
      fee_per_semester REAL NOT NULL DEFAULT 15000,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'full', 'maintenance')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Room Allocations Table (Tracks student to room assignments and historical changes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      bed_number TEXT,
      allocation_date DATE NOT NULL,
      vacating_date DATE,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'transferred', 'vacated')),
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
    );
  `);

  // 5. Complaints Table (Tracks student grievances across categories)
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Electricity', 'Water', 'Cleaning', 'Internet', 'Furniture', 'Other')),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Resolved')),
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // 6. Fees Table (Tracks semester fee dues per student)
  db.exec(`
    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      semester TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Partially Paid', 'Paid')),
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // 7. Payments Table (Records individual payment transactions for fees)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fee_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('UPI', 'Net Banking', 'Credit/Debit Card', 'Cash', 'Demand Draft')),
      transaction_reference TEXT NOT NULL UNIQUE,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // 8. Visitors Table (Security and warden visitor check-in/out logs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      visitor_name TEXT NOT NULL,
      visitor_phone TEXT NOT NULL,
      relationship TEXT NOT NULL,
      id_proof TEXT,
      check_in DATETIME NOT NULL,
      check_out DATETIME,
      status TEXT NOT NULL DEFAULT 'Checked In' CHECK(status IN ('Checked In', 'Checked Out')),
      purpose TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // 9. Maintenance Requests Table (Facilities repair and upkeep tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      issue_type TEXT NOT NULL,
      description TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      assigned_to TEXT,
      cost REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed')),
      reported_date DATE NOT NULL,
      completed_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
    );
  `);

  // 10. Activity Logs Table (Audit trail of system actions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Seed initial demo data if database is empty
  seedDemoData();
}

/**
 * Seeds demo data for testing and academic presentation
 */
function seedDemoData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    // Database already has data, no need to re-seed
    return;
  }

  console.log('Seeding initial demo data into hostel.db...');

  // Standard hashed password for demo accounts: "password123"
  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  // 1. Seed Users (Admin, Warden, and Students)
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, email, role, full_name, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminUserId = insertUser.run(
    'admin',
    defaultPasswordHash,
    'admin@hostel.edu',
    'admin',
    'System Administrator',
    '+91 98765 43210'
  ).lastInsertRowid;

  const wardenUserId = insertUser.run(
    'warden',
    defaultPasswordHash,
    'warden@hostel.edu',
    'warden',
    'Chief Warden Sharma',
    '+91 98765 43211'
  ).lastInsertRowid;

  const s1UserId = insertUser.run(
    'alex',
    defaultPasswordHash,
    'alex.morgan@student.edu',
    'student',
    'Alex Morgan',
    '+91 91234 56701'
  ).lastInsertRowid;

  const s2UserId = insertUser.run(
    'sophia',
    defaultPasswordHash,
    'sophia.chen@student.edu',
    'student',
    'Sophia Chen',
    '+91 91234 56702'
  ).lastInsertRowid;

  const s3UserId = insertUser.run(
    'rahul',
    defaultPasswordHash,
    'rahul.sharma@student.edu',
    'student',
    'Rahul Sharma',
    '+91 91234 56703'
  ).lastInsertRowid;

  const s4UserId = insertUser.run(
    'emily',
    defaultPasswordHash,
    'emily.davis@student.edu',
    'student',
    'Emily Davis',
    '+91 91234 56704'
  ).lastInsertRowid;

  const s5UserId = insertUser.run(
    'david',
    defaultPasswordHash,
    'david.kim@student.edu',
    'student',
    'David Kim',
    '+91 91234 56705'
  ).lastInsertRowid;

  // 2. Seed Students profiles
  const insertStudent = db.prepare(`
    INSERT INTO students (user_id, name, email, phone, department, year, enrollment_no, guardian_name, guardian_phone, address, blood_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const s1 = insertStudent.run(
    s1UserId,
    'Alex Morgan',
    'alex.morgan@student.edu',
    '+91 91234 56701',
    'Computer Science',
    2,
    'ENR2024001',
    'Robert Morgan',
    '+91 98111 22331',
    'Flat 402, Green Avenue, Mumbai',
    'O+'
  ).lastInsertRowid;

  const s2 = insertStudent.run(
    s2UserId,
    'Sophia Chen',
    'sophia.chen@student.edu',
    '+91 91234 56702',
    'Electronics & Comm.',
    3,
    'ENR2024002',
    'Michael Chen',
    '+91 98111 22332',
    '12 Sunrise Villa, Pune',
    'A+'
  ).lastInsertRowid;

  const s3 = insertStudent.run(
    s3UserId,
    'Rahul Sharma',
    'rahul.sharma@student.edu',
    '+91 91234 56703',
    'Mechanical Engg',
    1,
    'ENR2024003',
    'Suresh Sharma',
    '+91 98111 22333',
    '88 Civil Lines, Jaipur',
    'B+'
  ).lastInsertRowid;

  const s4 = insertStudent.run(
    s4UserId,
    'Emily Davis',
    'emily.davis@student.edu',
    '+91 91234 56704',
    'Information Technology',
    4,
    'ENR2024004',
    'George Davis',
    '+91 98111 22334',
    'Plot 14, Lotus Park, Bengaluru',
    'AB+'
  ).lastInsertRowid;

  const s5 = insertStudent.run(
    s5UserId,
    'David Kim',
    'david.kim@student.edu',
    '+91 91234 56705',
    'Civil Engineering',
    2,
    'ENR2024005',
    'Paul Kim',
    '+91 98111 22335',
    '501 Lakeview Heights, Hyderabad',
    'O-'
  ).lastInsertRowid;

  // 3. Seed Rooms
  const insertRoom = db.prepare(`
    INSERT INTO rooms (room_number, block, floor, room_type, capacity, fee_per_semester, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const r101 = insertRoom.run('A-101', 'A', 1, 'Single', 1, 25000, 'full').lastInsertRowid;
  const r102 = insertRoom.run('A-102', 'A', 1, 'Double', 2, 18000, 'available').lastInsertRowid;
  const r103 = insertRoom.run('A-103', 'A', 1, 'Triple', 3, 14000, 'available').lastInsertRowid;
  const r201 = insertRoom.run('A-201', 'A', 2, 'Double', 2, 18000, 'full').lastInsertRowid;
  const r202 = insertRoom.run('A-202', 'A', 2, 'Four-Bed', 4, 12000, 'available').lastInsertRowid;
  const rB101 = insertRoom.run('B-101', 'B', 1, 'Single', 1, 25000, 'available').lastInsertRowid;
  const rB102 = insertRoom.run('B-102', 'B', 1, 'Double', 2, 18000, 'maintenance').lastInsertRowid;
  const rC101 = insertRoom.run('C-101', 'C', 1, 'Double', 2, 18000, 'available').lastInsertRowid;

  // 4. Seed Room Allocations
  const insertAllocation = db.prepare(`
    INSERT INTO room_allocations (student_id, room_id, bed_number, allocation_date, status, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAllocation.run(s1, r101, 'Bed-1', '2024-08-01', 'active', 'Allocated single room on request');
  insertAllocation.run(s2, r102, 'Bed-A', '2024-08-01', 'active', 'Allocated double sharing bed A');
  insertAllocation.run(s3, r201, 'Bed-A', '2024-08-01', 'active', 'Allocated double room bed A');
  insertAllocation.run(s4, r201, 'Bed-B', '2024-08-01', 'active', 'Allocated double room bed B');
  // s5 not allocated yet to showcase unallocated student workflow

  // 5. Seed Complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (student_id, title, category, description, status, resolution_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertComplaint.run(s1, 'Ceiling fan making squeaking noise', 'Electricity', 'The ceiling fan speed regulator is jammed and creates loud rattling noise at night.', 'Pending', null, '-2 days');
  insertComplaint.run(s2, 'Bathroom tap leaking continuously', 'Water', 'Hot water tap in room 102 bathroom has a steady drip, wasting water.', 'In Progress', 'Plumber assigned, new washer ordered.', '-4 days');
  insertComplaint.run(s3, 'Wi-Fi disconnects frequently on Floor 2', 'Internet', 'Signal drops completely between 8 PM and 11 PM every evening.', 'Resolved', 'Replaced router on 2nd floor corridor switch box.', '-7 days');
  insertComplaint.run(s4, 'Study table leg is wobbly', 'Furniture', 'The right leg of the wooden desk needs tightening.', 'Pending', null, '-1 day');

  // 6. Seed Fees
  const insertFee = db.prepare(`
    INSERT INTO fees (student_id, semester, academic_year, total_amount, paid_amount, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const fee1 = insertFee.run(s1, 'Semester 3', '2024-2025', 25000, 25000, 'Paid', '2024-08-31').lastInsertRowid;
  const fee2 = insertFee.run(s2, 'Semester 5', '2024-2025', 18000, 10000, 'Partially Paid', '2024-08-31').lastInsertRowid;
  const fee3 = insertFee.run(s3, 'Semester 1', '2024-2025', 18000, 0, 'Pending', '2024-09-15').lastInsertRowid;
  const fee4 = insertFee.run(s4, 'Semester 7', '2024-2025', 18000, 18000, 'Paid', '2024-08-31').lastInsertRowid;
  const fee5 = insertFee.run(s5, 'Semester 3', '2024-2025', 15000, 0, 'Pending', '2024-09-30').lastInsertRowid;

  // 7. Seed Payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (fee_id, student_id, amount, payment_method, transaction_reference, remarks, payment_date)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertPayment.run(fee1, s1, 25000, 'UPI', 'UPI/20240801/992819', 'Full semester fee paid via Google Pay', '-10 days');
  insertPayment.run(fee2, s2, 10000, 'Net Banking', 'NB/20240805/771822', 'First installment paid online', '-8 days');
  insertPayment.run(fee4, s4, 18000, 'Credit/Debit Card', 'CC/20240802/551299', 'Full payment via HDFC Card', '-9 days');

  // 8. Seed Visitors
  const insertVisitor = db.prepare(`
    INSERT INTO visitors (student_id, visitor_name, visitor_phone, relationship, id_proof, check_in, check_out, status, purpose)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?), ?, ?)
  `);

  // Checked out visitor
  insertVisitor.run(s1, 'Robert Morgan', '+91 98111 22331', 'Father', 'Aadhaar Card: XXXX-4912', '-3 days', '-3 days, +2 hours', 'Checked Out', 'Dropping semester essentials and study material');
  // Currently Checked In visitor
  const insertCurrentVisitor = db.prepare(`
    INSERT INTO visitors (student_id, visitor_name, visitor_phone, relationship, id_proof, check_in, check_out, status, purpose)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?), NULL, 'Checked In', ?)
  `);
  insertCurrentVisitor.run(s2, 'Kavita Patel', '+91 97711 00223', 'Cousin', 'College ID: STU-8812', '-2 hours', 'Weekend visiting and study group discussion');
  insertCurrentVisitor.run(s3, 'Suresh Sharma', '+91 98111 22333', 'Father', 'Driving License: DL-04192', '-1 hour', 'Fee receipt verification and guardian meeting');

  // 9. Seed Maintenance Requests
  const insertMaintenance = db.prepare(`
    INSERT INTO maintenance_requests (room_id, issue_type, description, reported_by, assigned_to, cost, status, reported_date, completed_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMaintenance.run(rB102, 'Plumbing & Drainage', 'Main washroom drain clogged in B-102', 'Warden Sharma', 'Ramesh Plumber', 1200, 'In Progress', '2024-11-01', null);
  insertMaintenance.run(r101, 'Electrical Fixture', 'Switchboard replacement for reading light', 'Alex Morgan', 'Sunil Electrician', 450, 'Completed', '2024-10-20', '2024-10-21');
  insertMaintenance.run(r202, 'Carpentry', 'Door latch alignment and lock replacement', 'Warden Sharma', 'Deepak Carpenter', 600, 'Pending', '2024-11-10', null);

  // 10. Seed Activity Logs
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (user_id, action, module, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertLog.run(adminUserId, 'System Initialization', 'System', 'Hostel management database initialized with sample schema', '127.0.0.1', '-10 days');
  insertLog.run(wardenUserId, 'Room Allocation', 'Allocations', 'Assigned student Alex Morgan to Room A-101 (Bed-1)', '192.168.1.10', '-8 days');
  insertLog.run(adminUserId, 'Fee Record Created', 'Fees', 'Generated Semester 3 fees for 5 enrolled students', '192.168.1.2', '-7 days');
  insertLog.run(wardenUserId, 'Visitor Check-in', 'Visitors', 'Checked in visitor Kavita Patel for Sophia Chen', '192.168.1.10', '-2 hours');

  console.log('Sample demonstration data successfully seeded into hostel.db.');
}

// Automatically initialize tables and seed data upon module require
initializeDatabase();

module.exports = db;

