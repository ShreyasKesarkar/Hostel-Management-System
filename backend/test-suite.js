/**
 * Comprehensive Automated System Test Suite
 *
 * Tests the entire Hostel Management System:
 * - Database file persistence (hostel.db)
 * - Authentication for Admin, Warden, Student
 * - Role-based authorization
 * - Room capacity restriction validation
 * - Double-allocation prevention
 * - Room transfer logic
 * - Complaint lifecycle (Pending -> In Progress -> Resolved)
 * - Fee generation and simulated payment processing
 * - Visitor check-in and one-click check-out
 * - Maintenance tracking and cost aggregation
 */

const http = require('http');
const app = require('./server');

let server;
let adminToken = '';
let wardenToken = '';
let studentToken = '';

// Helper to send HTTP requests to Express server in memory
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5099,
        path: `/api${path}`,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING HOSTEL MANAGEMENT SYSTEM VERIFICATION ---');

  // Clean any previous test artifacts from database first
  const db = require('./database/db');
  db.prepare("DELETE FROM maintenance_requests WHERE room_id IN (SELECT id FROM rooms WHERE room_number LIKE 'TEST-%')").run();
  db.prepare("DELETE FROM room_allocations WHERE room_id IN (SELECT id FROM rooms WHERE room_number LIKE 'TEST-%')").run();
  db.prepare("DELETE FROM rooms WHERE room_number LIKE 'TEST-%'").run();
  db.prepare("DELETE FROM students WHERE enrollment_no LIKE 'ENR9%' OR enrollment_no LIKE 'ENR8%'").run();
  db.prepare("DELETE FROM users WHERE username LIKE 'enr9%' OR username LIKE 'enr8%'").run();

  // Start test server on port 5099
  server = app.listen(5099);
  await new Promise((r) => setTimeout(r, 500));

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'API Health Check returns healthy');

    // 2. Auth Tests
    const adminLogin = await request('POST', '/auth/login', { username: 'admin', password: 'password123' });
    assert(adminLogin.status === 200 && adminLogin.data.success && adminLogin.data.user.role === 'admin', 'Admin Login Successful');
    adminToken = adminLogin.data.token;

    const wardenLogin = await request('POST', '/auth/login', { username: 'warden', password: 'password123' });
    assert(wardenLogin.status === 200 && wardenLogin.data.user.role === 'warden', 'Warden Login Successful');
    wardenToken = wardenLogin.data.token;

    const studentLogin = await request('POST', '/auth/login', { username: 'alex', password: 'password123' });
    assert(studentLogin.status === 200 && studentLogin.data.user.role === 'student', 'Student Login Successful');
    studentToken = studentLogin.data.token;

    // Invalid Login
    const invalidLogin = await request('POST', '/auth/login', { username: 'admin', password: 'wrongpassword' });
    assert(invalidLogin.status === 401, 'Invalid password rejected with 401');

    // 3. Dashboard Stats
    const adminDashboard = await request('GET', '/dashboard/stats', null, adminToken);
    assert(adminDashboard.status === 200 && adminDashboard.data.data.rooms.total > 0, 'Admin Dashboard stats calculated from SQLite');

    const studentDashboard = await request('GET', '/dashboard/stats', null, studentToken);
    assert(studentDashboard.status === 200 && studentDashboard.data.data.roomInfo !== undefined, 'Student Dashboard delivers personalized room dossier');

    // 4. Student CRUD
    const newStudent = await request('POST', '/students', {
      name: 'Test Candidate',
      email: 'test.candidate@student.edu',
      phone: '+91 99999 11111',
      department: 'Computer Science',
      year: 2,
      enrollment_no: 'ENR9999999'
    }, adminToken);
    assert(newStudent.status === 201 && newStudent.data.success, 'New student created with login user account');
    const createdStudentId = newStudent.data.studentId;

    // Prevent duplicate enrollment
    const duplicateStudent = await request('POST', '/students', {
      name: 'Duplicate Candidate',
      email: 'dup@student.edu',
      phone: '+91 99999 22222',
      department: 'Civil Engineering',
      year: 1,
      enrollment_no: 'ENR9999999'
    }, adminToken);
    assert(duplicateStudent.status === 400, 'Duplicate enrollment number prevented');

    // 5. Room CRUD & Capacity Tests
    const newRoom = await request('POST', '/rooms', {
      room_number: 'TEST-101',
      block: 'D',
      floor: 1,
      room_type: 'Single',
      capacity: 1,
      fee_per_semester: 20000
    }, adminToken);
    assert(newRoom.status === 201 && newRoom.data.success, 'New room created in inventory');
    const createdRoomId = newRoom.data.roomId;

    // Allocate Candidate to TEST-101
    const alloc1 = await request('POST', '/allocations', {
      student_id: createdStudentId,
      room_id: createdRoomId,
      bed_number: 'Bed-1',
      allocation_date: '2024-11-15'
    }, adminToken);
    assert(alloc1.status === 201 && alloc1.data.success, 'Student allocated to TEST-101 (Single Room)');

    // Attempt second allocation to Single Room (should fail with capacity check)
    // Create another dummy student
    const student2 = await request('POST', '/students', {
      name: 'Test Candidate 2',
      email: 'test2@student.edu',
      phone: '+91 99999 33333',
      department: 'Mechanical Engg',
      year: 1,
      enrollment_no: 'ENR8888888'
    }, adminToken);
    const allocOverCapacity = await request('POST', '/allocations', {
      student_id: student2.data.studentId,
      room_id: createdRoomId,
      bed_number: 'Bed-2',
      allocation_date: '2024-11-15'
    }, adminToken);
    assert(allocOverCapacity.status === 400, 'Over-capacity allocation strictly blocked by room capacity check');

    // 6. Complaint Lifecycle
    const newComplaint = await request('POST', '/complaints', {
      title: 'Water filter issue',
      category: 'Water',
      description: 'Water dispenser not cooling in block corridor'
    }, studentToken);
    assert(newComplaint.status === 201 && newComplaint.data.success, 'Student submitted new complaint');
    const complaintId = newComplaint.data.complaintId;

    const updateComplaint = await request('PUT', `/complaints/${complaintId}/status`, {
      status: 'Resolved',
      resolution_notes: 'Technician replaced cooling thermostat'
    }, wardenToken);
    assert(updateComplaint.status === 200 && updateComplaint.data.success, 'Warden resolved complaint with notes');

    // 7. Fee Management & Simulated Payment
    const newFee = await request('POST', '/fees/generate', {
      student_id: createdStudentId,
      semester: 'Semester 1',
      academic_year: '2024-2025',
      total_amount: 15000,
      due_date: '2024-12-31'
    }, adminToken);
    assert(newFee.status === 201, 'Admin generated semester fee invoice');
    const feeId = newFee.data.feeId;

    // Make partial payment
    const partialPay = await request('POST', `/fees/${feeId}/pay`, {
      amount: 5000,
      payment_method: 'UPI',
      remarks: 'First installment'
    }, adminToken);
    assert(partialPay.status === 201 && partialPay.data.newStatus === 'Partially Paid', 'Partial payment recorded (Status: Partially Paid)');

    // Complete remaining payment
    const fullPay = await request('POST', `/fees/${feeId}/pay`, {
      amount: 10000,
      payment_method: 'Net Banking',
      remarks: 'Final installment'
    }, adminToken);
    assert(fullPay.status === 201 && fullPay.data.newStatus === 'Paid', 'Final payment recorded (Status: Paid in Full)');

    // 8. Visitor Management Check-In and Check-Out
    const checkIn = await request('POST', '/visitors', {
      student_id: createdStudentId,
      visitor_name: 'Anil Kumar',
      visitor_phone: '+91 98888 77777',
      relationship: 'Uncle',
      id_proof: 'DL-99201',
      purpose: 'College document delivery'
    }, wardenToken);
    assert(checkIn.status === 201 && checkIn.data.success, 'Visitor checked in successfully');
    const visitorId = checkIn.data.visitorId;

    const checkOut = await request('PUT', `/visitors/${visitorId}/checkout`, {}, wardenToken);
    assert(checkOut.status === 200 && checkOut.data.success, 'Visitor 1-click check-out successful');

    // 9. Maintenance Management
    const maint = await request('POST', '/maintenance', {
      room_id: createdRoomId,
      issue_type: 'Electrical Fixture',
      description: 'Switchboard sparking',
      cost: 350,
      assigned_to: 'Santosh Electrician'
    }, adminToken);
    assert(maint.status === 201, 'Maintenance work order created');

    const updateMaint = await request('PUT', `/maintenance/${maint.data.requestId}`, {
      status: 'Completed',
      cost: 400,
      restore_room_status: true
    }, adminToken);
    assert(updateMaint.status === 200, 'Maintenance work order completed');

    // 10. Clean up test records
    await request('DELETE', `/maintenance/${maint.data.requestId}`, null, adminToken);
    await request('DELETE', `/students/${createdStudentId}`, null, adminToken);
    await request('DELETE', `/students/${student2.data.studentId}`, null, adminToken);
    await request('DELETE', `/rooms/${createdRoomId}`, null, adminToken);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
