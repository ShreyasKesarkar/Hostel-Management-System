# HostelHub — Hostel Management System

A full-stack, production-grade **Hostel Management System** built with **React.js**, **Node.js**, **Express.js**, and an embedded **SQLite** database (`better-sqlite3`).

Designed specifically for college academic submissions and viva defense, this project features clean, beginner-friendly code, comprehensive comments explaining **why** and **what** every module does, an actual `.db` SQLite file with seed demo data, and a modern SaaS dashboard UI.

---

## 1. Project Introduction & Objectives

Hostel administration in universities has traditionally relied on physical registers and spreadsheets. This leads to common bottlenecks: double room allocation, inaccurate occupancy records, uncollected dues, untracked complaints, and paper gate passes.

**HostelHub** automates the entire residential hostel workflow:
- **Role-Based Access Control (RBAC)**: Dedicated dashboards and privilege boundaries for **Admin**, **Warden**, and **Student**.
- **Capacity-Controlled Room Allocation**: Enforces strict bed capacity limits, prevents over-allocation, and supports room transfers and bed vacating with history logs.
- **Grievance Redressal (Complaints)**: Students file tickets across categories (Electricity, Water, Cleaning, Internet, Furniture, Other); wardens update resolution notes and lifecycle statuses.
- **Fee Management & Simulated Payments**: Maintains semester invoices, tracks paid and pending amounts, and records simulated academic payment receipts (UPI, Net Banking, Card, Cash).
- **Visitor Gate Pass Tracking**: Logs guest entries, tracks currently inside visitors in real time, and supports one-click check-out.
- **Facilities Maintenance**: Tracks room repair tickets, technician work orders, and maintenance expenditures.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React.js (JavaScript) + Vite | Fast, component-based user interface |
| **Styling** | Tailwind CSS | Modern, clean SaaS dashboard typography and responsive design |
| **Icons** | Lucide React | Clean, scalable vector icons |
| **Routing** | React Router DOM (v7) | Client-side routing and protected route guards |
| **HTTP Client** | Axios | REST API communication with JWT interceptors |
| **Backend** | Node.js + Express.js | Asynchronous RESTful API services |
| **Database** | SQLite (`better-sqlite3`) | Embedded, zero-configuration ACID relational database (`backend/database/hostel.db`) |
| **Authentication** | JWT (`jsonwebtoken`) + `bcryptjs` | Secure password hashing and stateless token authentication |

> **Note**: Strictly implemented using standard JavaScript (no TypeScript, MongoDB, or Firebase).

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React.js Frontend                    │
│   (Vite + Tailwind CSS + React Router + Lucide Icons)  │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTP JSON / REST APIs
               (Axios + JWT Bearer Token)
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Express.js Backend                    │
│   - JWT Auth & Role Middleware (Admin, Warden, Student) │
│   - Modular Controllers (Rooms, Students, Complaints...)│
│   - Parameterized SQL Prepared Statements              │
└───────────────────────────┬────────────────────────────┘
                            │
                   better-sqlite3 Driver
                   (WAL Mode + Foreign Keys ON)
                            │
┌───────────────────────────▼────────────────────────────┐
│               SQLite Relational Database               │
│               backend/database/hostel.db               │
│   (users, students, rooms, room_allocations, etc.)     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema & Tables

The SQLite database file is located directly at **`backend/database/hostel.db`**.

```
[users] 1 ──── 1 [students]
                     │
                     ├──── 1..* [room_allocations] * ──── 1 [rooms]
                     │                                         │
                     ├──── 1..* [complaints]                   └──── 1..* [maintenance_requests]
                     ├──── 1..* [fees] 1 ──── 1..* [payments]
                     └──── 1..* [visitors]
```

### Table Breakdown:
1. **`users`**: User login accounts (`id`, `username`, `password`, `email`, `role` ['admin', 'warden', 'student'], `full_name`, `phone`, `created_at`).
2. **`students`**: Resident profiles (`id`, `user_id`, `name`, `email`, `phone`, `department`, `year`, `enrollment_no`, `guardian_name`, `guardian_phone`, `address`, `blood_group`).
3. **`rooms`**: Room inventory (`id`, `room_number`, `block`, `floor`, `room_type`, `capacity`, `fee_per_semester`, `status`).
4. **`room_allocations`**: Bed allocations (`id`, `student_id`, `room_id`, `bed_number`, `allocation_date`, `vacating_date`, `status` ['active', 'transferred', 'vacated'], `remarks`).
5. **`complaints`**: Student grievances (`id`, `student_id`, `title`, `category`, `description`, `status` ['Pending', 'In Progress', 'Resolved'], `resolution_notes`).
6. **`fees`**: Semester invoices (`id`, `student_id`, `semester`, `academic_year`, `total_amount`, `paid_amount`, `status`, `due_date`).
7. **`payments`**: Payment transaction receipts (`id`, `fee_id`, `student_id`, `amount`, `payment_method`, `transaction_reference`, `remarks`).
8. **`visitors`**: Security gate passes (`id`, `student_id`, `visitor_name`, `visitor_phone`, `relationship`, `id_proof`, `check_in`, `check_out`, `status`, `purpose`).
9. **`maintenance_requests`**: Facility repair orders (`id`, `room_id`, `issue_type`, `description`, `assigned_to`, `cost`, `status`, `reported_date`, `completed_date`).
10. **`activity_logs`**: System audit trail (`id`, `user_id`, `action`, `module`, `details`, `ip_address`, `created_at`).

---

## 5. Folder Structure

```
HotelManagementSystem/
│
├── backend/
│   ├── controllers/            # Controller business logic
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── roomController.js
│   │   ├── allocationController.js
│   │   ├── complaintController.js
│   │   ├── feeController.js
│   │   ├── visitorController.js
│   │   ├── maintenanceController.js
│   │   └── dashboardController.js
│   ├── database/
│   │   ├── db.js               # SQLite connection & table creation
│   │   └── hostel.db           # SQLite database file
│   ├── middleware/
│   │   └── auth.js             # JWT verification and RBAC middleware
│   ├── routes/                 # Express API routes
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── allocationRoutes.js
│   │   ├── complaintRoutes.js
│   │   ├── feeRoutes.js
│   │   ├── visitorRoutes.js
│   │   ├── maintenanceRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/
│   │   └── logger.js           # Activity logger utility
│   ├── server.js               # Express server entry point
│   ├── test-suite.js           # Automated system verification tests
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── StatCard.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── ConfirmModal.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Alert.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state provider
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx # SaaS sidebar & topbar layout
│   │   ├── pages/              # Application views
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── StudentsPage.jsx
│   │   │   ├── RoomsPage.jsx
│   │   │   ├── ComplaintsPage.jsx
│   │   │   ├── FeesPage.jsx
│   │   │   ├── VisitorsPage.jsx
│   │   │   ├── MaintenancePage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   └── api.js          # Axios instance with JWT interceptor
│   │   ├── App.jsx             # React Router route definitions
│   │   ├── main.jsx            # Application entry
│   │   └── index.css           # Tailwind CSS directives
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
│
├── database_schema.sql         # Pure SQL table creation script
├── API_DOCUMENTATION.md        # Complete REST API reference
├── VIVA_QUESTIONS.md           # 30+ Viva questions and answers
└── README.md                   # Project documentation
```

---

## 6. Demo Login Credentials

The database comes pre-seeded with accounts for all roles. All demo accounts share the password: **`password123`**.

| Role | Username | Password | Notes |
|---|---|---|---|
| **👑 Admin** | `admin` | `password123` | Full access to students, rooms, finances, maintenance, and deletion |
| **🛡️ Warden** | `warden` | `password123` | Room allocations, complaint resolution, visitor check-in, maintenance |
| **🎓 Student 1** | `alex` | `password123` | Alex Morgan (Single Room A-101) |
| **🎓 Student 2** | `sophia` | `password123` | Sophia Chen (Double Room A-102) |
| **🎓 Student 3** | `rahul` | `password123` | Rahul Sharma (Double Room A-201) |

> **Viva Tip**: On the Login screen, click any of the **Demo Account quick-fill buttons** to immediately populate the form and log in with one click.

---

## 7. How to Install and Run the Project

### Prerequisites
- Node.js (v18, v20, or v22+ recommended)
- npm (Node Package Manager)

### Step 1: Start the Backend Server
Open a terminal in the project root:
```bash
cd backend
npm start
```
The backend will automatically:
1. Connect to `backend/database/hostel.db`.
2. Create all 10 tables if they do not exist.
3. Seed default accounts, rooms, and records.
4. Listen on **`http://localhost:5000`**.

### Step 2: Start the Frontend Application
Open a second terminal window:
```bash
cd frontend
npm run dev
```
Open your browser and navigate to:  
👉 **`http://localhost:5173`**

---

## 8. Running the Automated System Test Suite

To verify all 21 core functional requirements (authentication, capacity restriction, room transfer, fee payment, visitor pass, maintenance) against the SQLite database:
```bash
cd backend
node test-suite.js
```
Expected output:
```
[PASS] API Health Check returns healthy
[PASS] Admin Login Successful
[PASS] Warden Login Successful
[PASS] Student Login Successful
[PASS] Admin Dashboard stats calculated from SQLite
[PASS] New student created with login user account
[PASS] Duplicate enrollment number prevented
[PASS] Student allocated to TEST-101 (Single Room)
[PASS] Over-capacity allocation strictly blocked by room capacity check
[PASS] Student submitted new complaint
[PASS] Warden resolved complaint with notes
[PASS] Admin generated semester fee invoice
[PASS] Partial payment recorded (Status: Partially Paid)
[PASS] Final payment recorded (Status: Paid in Full)
[PASS] Visitor checked in successfully
[PASS] Visitor 1-click check-out successful
[PASS] Maintenance work order created
[PASS] Maintenance work order completed
====================================================
TEST SUMMARY: 21 Passed, 0 Failed
====================================================
```

---

## 9. How to Inspect `hostel.db` Using DB Browser for SQLite

You can inspect the actual SQLite database file using the free, open-source tool **DB Browser for SQLite**:

1. Download **DB Browser for SQLite** from [sqlitebrowser.org](https://sqlitebrowser.org/).
2. Open DB Browser and click **"Open Database"**.
3. Browse to and select:  
   `HotelManagementSystem/backend/database/hostel.db`
4. Under the **"Database Structure"** tab, you will see all 10 tables, indices, and schema definitions.
5. Under the **"Browse Data"** tab, choose any table (e.g. `users`, `students`, `rooms`, `room_allocations`, `fees`, `payments`) to view the stored records.
6. Under the **"Execute SQL"** tab, you can execute custom SQL queries, such as:
   ```sql
   SELECT r.room_number, r.capacity, COUNT(ra.id) as occupied_beds
   FROM rooms r
   LEFT JOIN room_allocations ra ON r.id = ra.room_id AND ra.status = 'active'
   GROUP BY r.id;
   ```

---

## 10. Key Workflows & viva Highlights

### Room Capacity Control Workflow
1. When allocating a student to a room (`allocationController.js`), the server executes `SELECT COUNT(*) FROM room_allocations WHERE room_id = ? AND status = 'active'`.
2. If the count matches the room's `capacity`, the transaction is aborted with `400 Bad Request`.
3. If successful, the room's status is automatically set to `'full'`.

### Room Transfer Workflow
1. Marks the existing room allocation record as `'transferred'` with the transfer date.
2. Creates a new active allocation record in the new room.
3. Automatically sets the old room status back to `'available'`.

### Student Fee Payments Workflow
1. Invoices are stored in `fees`.
2. When a simulated payment is made, a record is added to `payments` with an auto-generated transaction reference (e.g., `TXN-1731600000-4821`).
3. The invoice `paid_amount` is updated and its status shifts from `Pending` -> `Partially Paid` -> `Paid`.

---

## 11. Academic Submission Documents Included

- **`database_schema.sql`**: Complete standalone SQL schema DDL.
- **`API_DOCUMENTATION.md`**: Complete REST API endpoints guide.
- **`VIVA_QUESTIONS.md`**: 30 comprehensive viva questions and answers covering React, Node.js, Express, SQLite, REST APIs, and authentication.

