/**
 * Students Management Page Component
 *
 * Provides complete lifecycle management for students:
 * - Search students by name, email, or enrollment number
 * - Filter by department, academic year, and room allocation status
 * - Add new student (automatically creates user credentials)
 * - Edit student profile
 * - Detailed modal displaying student's room, fees, and grievance logs
 * - Delete student with confirmation dialog
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  GraduationCap,
  Mail,
  Phone,
  BedDouble,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StudentsPage = () => {
  const { isAdmin } = useAuth();

  // State hooks for data, loading, and alerts
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [allocationFilter, setAllocationFilter] = useState('All');

  // Modal visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected student state for viewing/editing/deleting
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);

  // Form input state for adding/editing students
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Computer Science',
    year: '1',
    enrollment_no: '',
    guardian_name: '',
    guardian_phone: '',
    address: '',
    blood_group: 'O+',
    password: 'password123'
  });

  const departments = [
    'Computer Science',
    'Electronics & Comm.',
    'Mechanical Engg',
    'Civil Engineering',
    'Information Technology',
    'Electrical Engg'
  ];

  // Fetch students on component load and whenever filter parameters change
  useEffect(() => {
    fetchStudents();
  }, [searchTerm, selectedDept, selectedYear, allocationFilter]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedDept !== 'All') params.department = selectedDept;
      if (selectedYear !== 'All') params.year = selectedYear;
      if (allocationFilter !== 'All') params.allocationStatus = allocationFilter;

      const response = await api.get('/students', { params });
      if (response.data && response.data.success) {
        setStudents(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setAlert({ type: 'error', message: 'Failed to load students.' });
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal with selected student's data
  const handleEditClick = (student) => {
    setCurrentStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      department: student.department,
      year: student.year.toString(),
      enrollment_no: student.enrollment_no,
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      address: student.address || '',
      blood_group: student.blood_group || 'O+',
      password: ''
    });
    setIsEditModalOpen(true);
  };

  // Open View Details Modal
  const handleViewClick = async (student) => {
    try {
      const response = await api.get(`/students/${student.id}`);
      if (response.data && response.data.success) {
        setStudentDetails(response.data.data);
        setIsViewModalOpen(true);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load full student details.' });
    }
  };

  // Handle Form Submission for Adding Student
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/students', formData);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsAddModalOpen(false);
        resetForm();
        fetchStudents();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to add student.'
      });
    }
  };

  // Handle Form Submission for Updating Student
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/students/${currentStudent.id}`, formData);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsEditModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update student.'
      });
    }
  };

  // Handle Student Deletion Confirmation
  const handleDeleteConfirm = async () => {
    try {
      const response = await api.delete(`/students/${currentStudent.id}`);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsDeleteModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete student.'
      });
      setIsDeleteModalOpen(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: 'Computer Science',
      year: '1',
      enrollment_no: '',
      guardian_name: '',
      guardian_phone: '',
      address: '',
      blood_group: 'O+',
      password: 'password123'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Student Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage enrolled hostel residents and room assignments</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, enrollment no, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Department Filter */}
        <div className="w-full md:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-blue-500 transition"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="w-full md:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-blue-500 transition"
          >
            <option value="All">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>

        {/* Allocation Status Filter */}
        <div className="w-full md:w-auto">
          <select
            value={allocationFilter}
            onChange={(e) => setAllocationFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-blue-500 transition"
          >
            <option value="All">All Allocation States</option>
            <option value="allocated">Allocated to Room</option>
            <option value="unallocated">Unallocated</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <div className="inline-block w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p>Loading students...</p>
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Enrollment No</th>
                  <th className="py-3 px-4">Department & Year</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Assigned Room</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition">
                    {/* Name & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{student.name}</p>
                          <p className="text-[11px] text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Enrollment */}
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                      {student.enrollment_no}
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-700">{student.department}</p>
                      <p className="text-[11px] text-slate-400">Year {student.year}</p>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {student.phone}
                    </td>

                    {/* Room Allocation */}
                    <td className="py-3 px-4">
                      {student.room_number ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                          <BedDouble className="w-3.5 h-3.5" />
                          <span>{student.room_number} ({student.bed_number || 'Bed 1'})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unallocated</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleViewClick(student)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="View student history & profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(student)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Edit profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setCurrentStudent(student);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            No students found matching your search or filters.
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD STUDENT                                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Student Resident"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enrollment Number *</label>
              <input
                type="text"
                required
                value={formData.enrollment_no}
                onChange={(e) => setFormData({ ...formData, enrollment_no: e.target.value })}
                placeholder="e.g. ENR2024099"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@college.edu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year *</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Name</label>
              <input
                type="text"
                value={formData.guardian_name}
                onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                placeholder="Parent or Guardian"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Phone</label>
              <input
                type="text"
                value={formData.guardian_phone}
                onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Password</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Username will be enrollment number. Default: password123
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="City, State, Postal code"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Create Student Record
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: EDIT STUDENT                                    */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Student: ${currentStudent?.name}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enrollment No *</label>
              <input
                type="text"
                required
                value={formData.enrollment_no}
                onChange={(e) => setFormData({ ...formData, enrollment_no: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: VIEW STUDENT DETAILS                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Student Residential Dossier"
        maxWidth="max-w-3xl"
      >
        {studentDetails && (
          <div className="space-y-6 text-xs md:text-sm">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center">
                {studentDetails.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900">{studentDetails.name}</h4>
                <p className="text-xs text-slate-500">
                  {studentDetails.enrollment_no} • {studentDetails.department} (Year {studentDetails.year})
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Email: {studentDetails.email} | Phone: {studentDetails.phone}
                </p>
              </div>
              {studentDetails.room_number ? (
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Current Room</span>
                  <span className="text-sm font-bold text-blue-600 block">
                    {studentDetails.room_number} ({studentDetails.bed_number})
                  </span>
                </div>
              ) : (
                <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                  Unallocated
                </span>
              )}
            </div>

            {/* Room Allocation History */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-2">Room History</h5>
              {studentDetails.allocationHistory && studentDetails.allocationHistory.length > 0 ? (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2.5">Room</th>
                        <th className="p-2.5">Bed</th>
                        <th className="p-2.5">Allocation Date</th>
                        <th className="p-2.5">Vacating Date</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentDetails.allocationHistory.map((h) => (
                        <tr key={h.id}>
                          <td className="p-2.5 font-semibold text-slate-800">{h.room_number}</td>
                          <td className="p-2.5">{h.bed_number}</td>
                          <td className="p-2.5">{h.allocation_date}</td>
                          <td className="p-2.5">{h.vacating_date || '—'}</td>
                          <td className="p-2.5"><StatusBadge status={h.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No allocation history recorded.</p>
              )}
            </div>

            {/* Fees summary */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-2">Fee Invoices</h5>
              {studentDetails.fees && studentDetails.fees.length > 0 ? (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2.5">Semester</th>
                        <th className="p-2.5">Total Amount</th>
                        <th className="p-2.5">Paid Amount</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentDetails.fees.map((f) => (
                        <tr key={f.id}>
                          <td className="p-2.5 font-medium">{f.semester}</td>
                          <td className="p-2.5">₹{f.total_amount}</td>
                          <td className="p-2.5 text-emerald-600 font-semibold">₹{f.paid_amount}</td>
                          <td className="p-2.5"><StatusBadge status={f.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No fee records found for this student.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Student Record"
        message={`Are you sure you want to delete student '${currentStudent?.name}' (${currentStudent?.enrollment_no})? This will vacate their allocated bed, remove linked user login, and purge student records.`}
        confirmText="Confirm Delete"
      />
    </div>
  );
};

export default StudentsPage;

