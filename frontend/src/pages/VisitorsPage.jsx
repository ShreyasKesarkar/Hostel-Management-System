/**
 * Visitor Gate Pass Management Page Component
 *
 * Implements security check-in/out tracking for hostel visitors:
 * - Logs visitor name, phone, relationship, host student, ID proof, and purpose
 * - Displays currently checked-in campus guests with live timer
 * - 1-Click checkout functionality updating departure timestamp
 * - Search by visitor name, phone, or host student
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  LogOut,
  Clock,
  Phone,
  Shield,
  FileText
} from 'lucide-react';

const VisitorsPage = () => {
  const { isStaff, isStudent } = useAuth();

  // State
  const [visitors, setVisitors] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  // Check-In Form State
  const [formData, setFormData] = useState({
    student_id: '',
    visitor_name: '',
    visitor_phone: '',
    relationship: 'Parent',
    id_proof: '',
    purpose: 'Family visit'
  });

  useEffect(() => {
    fetchVisitors();
    if (isStaff) {
      fetchStudents();
    }
  }, [statusFilter, searchTerm]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await api.get('/visitors', { params });
      if (response.data && response.data.success) {
        setVisitors(response.data.data);
        setActiveCount(response.data.activeCount || 0);
      }
    } catch (err) {
      console.error('Failed to load visitors:', err);
      setAlert({ type: 'error', message: 'Failed to load visitor records.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      if (response.data && response.data.success) {
        setStudents(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  // Submit Visitor Check-In
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/visitors', formData);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsCheckInModalOpen(false);
        setFormData({
          student_id: '',
          visitor_name: '',
          visitor_phone: '',
          relationship: 'Parent',
          id_proof: '',
          purpose: 'Family visit'
        });
        fetchVisitors();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to check in visitor.' });
    }
  };

  // 1-Click Check-Out Visitor
  const handleCheckOut = async (visitorId, visitorName) => {
    try {
      const response = await api.put(`/visitors/${visitorId}/checkout`, {});
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: `${visitorName} has been checked out successfully.` });
        fetchVisitors();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Check-out failed.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Visitor Gate Pass Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Campus security log for hostel guest visits and departure tracking</p>
        </div>
        {isStaff && (
          <button
            onClick={() => setIsCheckInModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Check-In Visitor</span>
          </button>
        )}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Active count ribbon & filters */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by visitor name, phone, or host student..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'All' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setStatusFilter('Checked In')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === 'Checked In' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
            }`}
          >
            <span>Currently Inside</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full">
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('Checked Out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'Checked Out' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
            }`}
          >
            Checked Out
          </button>
        </div>
      </div>

      {/* Visitors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <div className="inline-block w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p>Loading visitor pass logs...</p>
          </div>
        ) : visitors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Visitor</th>
                  <th className="py-3 px-4">Host Student</th>
                  <th className="py-3 px-4">Relationship & Purpose</th>
                  <th className="py-3 px-4">Check-In Time</th>
                  <th className="py-3 px-4">Check-Out Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitors.map((v) => {
                  const isCurrentlyInside = v.status === 'Checked In';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{v.visitor_name}</p>
                        <p className="text-[11px] text-slate-400">{v.visitor_phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-700">{v.student_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {v.enrollment_no} {v.room_number ? `• Room ${v.room_number}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-700">{v.relationship}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{v.purpose}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium text-xs">
                        {new Date(v.check_in).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {v.check_out ? new Date(v.check_out).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isStaff && isCurrentlyInside && (
                          <button
                            onClick={() => handleCheckOut(v.id, v.visitor_name)}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition inline-flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Check Out</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">No visitor logs found.</div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CHECK-IN VISITOR                                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        title="Visitor Gate Pass Check-In"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCheckInSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Host Student *</label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">-- Select resident student --</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.enrollment_no} {st.room_number ? `- Room ${st.room_number}` : ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Visitor Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Patel"
              value={formData.visitor_name}
              onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+91 98765 00000"
                value={formData.visitor_phone}
                onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship *</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="Parent">Parent / Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Relative">Relative</option>
                <option value="Friend">Friend / Classmate</option>
                <option value="Official">Official / Vendor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ID Proof Reference</label>
            <input
              type="text"
              placeholder="e.g. Aadhaar / Driving License / Student ID"
              value={formData.id_proof}
              onChange={(e) => setFormData({ ...formData, id_proof: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Visit Purpose *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bringing study materials & clothes"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCheckInModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Issue Gate Pass
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VisitorsPage;

