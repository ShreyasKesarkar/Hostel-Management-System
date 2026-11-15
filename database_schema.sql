-- =====================================================================
-- HOSTEL MANAGEMENT SYSTEM - DATABASE SCHEMA (SQLite)
-- Database File: backend/database/hostel.db
-- Engine: SQLite 3 with better-sqlite3 driver
-- =====================================================================

-- Turn on foreign key enforcement in SQLite
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- TABLE 1: users
-- Purpose: System authentication, role-based access (Admin, Warden, Student)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,                     -- Bcrypt hashed password
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'warden', 'student')),
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- TABLE 2: students
-- Purpose: Student resident profiles linked to user login account
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 3: rooms
-- Purpose: Hostel rooms configuration, bed capacities, and semester fees
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 4: room_allocations
-- Purpose: Tracks active student-to-room allocations, bed tags, and history
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 5: complaints
-- Purpose: Student grievances, issue categories, and resolution lifecycle
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 6: fees
-- Purpose: Semester fee demands and invoices per student
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 7: payments
-- Purpose: Individual payment transaction receipts linked to fee invoices
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 8: visitors
-- Purpose: Campus gate security pass, visitor logs, and check-out tracking
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 9: maintenance_requests
-- Purpose: Hostel repair work orders, technician assignments, and cost tracking
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- TABLE 10: activity_logs
-- Purpose: System audit trail for security and viva demonstration
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- INDEXES FOR QUERY OPTIMIZATION
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_no);
CREATE INDEX IF NOT EXISTS idx_rooms_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_allocations_active ON room_allocations(room_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);

