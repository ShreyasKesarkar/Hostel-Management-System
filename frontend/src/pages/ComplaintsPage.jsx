/**
 * Complaints Management Page Component
 *
 * Facilitates student grievance logging and warden resolution:
 * - Students can submit complaints across categories (Electricity, Water, Cleaning, etc.)
 * - Role isolation: Students view only their own complaints; Staff view all
 * - Wardens and Admins can update status (Pending -> In Progress -> Resolved) and add resolution notes
 * - Filter by status and issue category
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquareWarning,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Zap,
  Droplet,
  Sparkles,
  Wifi,
  Armchair,
  HelpCircle
} from 'lucide-react';

const ComplaintsPage = () => {
  const { user, isStudent, isStaff } = useAuth();

  // Component state
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Form data for new complaint
  const [formData, setFormData] = useState({
    title: '',
    category: 'Electricity',
    description: ''
  });

  // Form data for status update
  const [statusForm, setStatusForm] = useState({
    status: 'In Progress',
    resolution_notes: ''
  });

  const categories = ['Electricity', 'Water', 'Cleaning', 'Internet', 'Furniture', 'Other'];

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (categoryFilter !== 'All') params.category = categoryFilter;

      const response = await api.get('/complaints', { params });
      if (response.data && response.data.success) {
        setComplaints(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
      setAlert({ type: 'error', message: 'Failed to retrieve complaints.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/complaints', formData);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsSubmitModalOpen(false);
        setFormData({ title: '', category: 'Electricity', description: '' });
        fetchComplaints();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit complaint.' });
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/complaints/${selectedComplaint.id}/status`, statusForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsStatusModalOpen(false);
        fetchComplaints();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update complaint status.' });
    }
  };

  // Helper icon for categories
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Electricity':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Water':
        return <Droplet className="w-4 h-4 text-blue-500" />;
      case 'Cleaning':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'Internet':
        return <Wifi className="w-4 h-4 text-indigo-500" />;
      case 'Furniture':
        return <Armchair className="w-4 h-4 text-orange-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Hostel Complaints & Helpdesk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStudent
              ? 'Report room maintenance issues, electrical faults, and hygiene concerns'
              : 'Review and resolve student grievances and room repairs'}
          </p>
        </div>
        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Lodge Complaint</span>
        </button>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filters:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <div className="inline-block w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p>Loading complaints...</p>
          </div>
        ) : complaints.length > 0 ? (
          complaints.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        #{item.id} • {item.category}
                      </span>
                      {item.room_number && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          Room {item.room_number}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">{item.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>

                <div className="flex flex-col md:items-end justify-between gap-2 flex-shrink-0">
                  <StatusBadge status={item.status} />
                  <span className="text-[11px] text-slate-400">
                    Logged: {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Resolution Notes section */}
              {item.resolution_notes && (
                <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl text-xs text-slate-700">
                  <span className="font-semibold text-slate-900 block mb-0.5">Warden Resolution Notes:</span>
                  <p>{item.resolution_notes}</p>
                </div>
              )}

              {/* Footer row */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Filed by: {item.student_name} ({item.enrollment_no})</span>

                {isStaff && (
                  <button
                    onClick={() => {
                      setSelectedComplaint(item);
                      setStatusForm({
                        status: item.status,
                        resolution_notes: item.resolution_notes || ''
                      });
                      setIsStatusModalOpen(true);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50"
                  >
                    Update Status & Action
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
            No complaints found for the selected filter criteria.
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: LODGE COMPLAINT                                 */}
      {/* ======================================================== */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="File a Hostel Complaint"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitComplaint} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Subject / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Geyser not heating in Room 201"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description *</label>
            <textarea
              required
              rows={4}
              placeholder="Describe the issue, location, and symptoms clearly..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: UPDATE STATUS (WARDEN / ADMIN)                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Update Complaint #${selectedComplaint?.id}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Lifecycle *</label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="Pending">Pending (Awaiting technician)</option>
              <option value="In Progress">In Progress (Work scheduled)</option>
              <option value="Resolved">Resolved (Fixed & verified)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution / Action Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. Electrician visited and replaced the fuse."
              value={statusForm.resolution_notes}
              onChange={(e) => setStatusForm({ ...statusForm, resolution_notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Save Resolution
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComplaintsPage;

