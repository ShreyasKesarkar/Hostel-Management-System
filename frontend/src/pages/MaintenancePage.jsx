/**
 * Maintenance Management Page Component
 *
 * Tracks facilities repair operations, technician assignments, and expenses:
 * - Summary cards of maintenance expenditures and task counts
 * - Report new room repairs (with optional toggle to take room offline into 'maintenance')
 * - Update status (Pending -> In Progress -> Completed), assign technicians, record repair costs
 * - Filter by status and room
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Building,
  UserCheck
} from 'lucide-react';

const MaintenancePage = () => {
  const { isStaff } = useAuth();

  // State
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ totalCost: 0, pendingCount: 0, inProgressCount: 0, completedCount: 0 });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // New Maintenance Form
  const [reportForm, setReportForm] = useState({
    room_id: '',
    issue_type: 'Plumbing',
    description: '',
    cost: 0,
    assigned_to: '',
    set_room_maintenance: false
  });

  // Update Task Form
  const [updateForm, setUpdateForm] = useState({
    status: 'In Progress',
    assigned_to: '',
    cost: 0,
    completed_date: '',
    restore_room_status: true
  });

  const issueTypes = [
    'Plumbing & Drainage',
    'Electrical Fixture',
    'Carpentry & Door',
    'Civil / Wall Repair',
    'Appliance / Geyser',
    'Pest Control',
    'Painting'
  ];

  useEffect(() => {
    fetchMaintenance();
    fetchRooms();
  }, [statusFilter]);

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;

      const response = await api.get('/maintenance', { params });
      if (response.data && response.data.success) {
        setRequests(response.data.data);
        if (response.data.summary) {
          setSummary(response.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load maintenance records:', err);
      setAlert({ type: 'error', message: 'Failed to load maintenance data.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms');
      if (response.data && response.data.success) {
        setRooms(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  // Submit New Maintenance Report
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/maintenance', reportForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsReportModalOpen(false);
        setReportForm({
          room_id: '',
          issue_type: 'Plumbing & Drainage',
          description: '',
          cost: 0,
          assigned_to: '',
          set_room_maintenance: false
        });
        fetchMaintenance();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to report maintenance.' });
    }
  };

  // Open Update Modal
  const handleOpenUpdate = (task) => {
    setSelectedTask(task);
    setUpdateForm({
      status: task.status,
      assigned_to: task.assigned_to || '',
      cost: task.cost || 0,
      completed_date: task.completed_date || new Date().toISOString().split('T')[0],
      restore_room_status: true
    });
    setIsUpdateModalOpen(true);
  };

  // Submit Update
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/maintenance/${selectedTask.id}`, updateForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsUpdateModalOpen(false);
        fetchMaintenance();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update maintenance.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Hostel Facilities & Maintenance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track repairs, technician work orders, and maintenance expenditures</p>
        </div>
        {isStaff && (
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report Issue</span>
          </button>
        )}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Expense"
          value={`₹${summary.totalCost?.toLocaleString()}`}
          subtitle="Cumulative repair costs"
          icon={DollarSign}
          color="blue"
        />

        <StatCard
          title="Pending Requests"
          value={summary.pendingCount || 0}
          subtitle="Awaiting technician assignment"
          icon={AlertTriangle}
          color="amber"
        />

        <StatCard
          title="In Progress"
          value={summary.inProgressCount || 0}
          subtitle="Repairs underway"
          icon={Clock}
          color="purple"
        />

        <StatCard
          title="Completed"
          value={summary.completedCount || 0}
          subtitle="Successfully fixed issues"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
        >
          <option value="All">All Task Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Maintenance Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <div className="inline-block w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p>Loading maintenance records...</p>
          </div>
        ) : requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Task #</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Issue Type & Description</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">MNT-{task.id}</td>
                    <td className="py-3 px-4 font-bold text-blue-600">
                      Room {task.room_number}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{task.issue_type}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{task.description}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {task.assigned_to ? (
                        <span className="font-medium">{task.assigned_to}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      ₹{task.cost?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {task.reported_date}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isStaff && (
                        <button
                          onClick={() => handleOpenUpdate(task)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        >
                          Update Task
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">No maintenance tickets found.</div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: REPORT MAINTENANCE TASK                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Create Maintenance Work Order"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Room *</label>
            <select
              required
              value={reportForm.room_id}
              onChange={(e) => setReportForm({ ...reportForm, room_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">-- Choose Room --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} (Block {r.block})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category *</label>
            <select
              value={reportForm.issue_type}
              onChange={(e) => setReportForm({ ...reportForm, issue_type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              {issueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Description *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Broken pipe valve under sink"
              value={reportForm.description}
              onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Technician</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Plumber"
                value={reportForm.assigned_to}
                onChange={(e) => setReportForm({ ...reportForm, assigned_to: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={reportForm.cost}
                onChange={(e) => setReportForm({ ...reportForm, cost: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
            <input
              type="checkbox"
              id="set_maint"
              checked={reportForm.set_room_maintenance}
              onChange={(e) => setReportForm({ ...reportForm, set_room_maintenance: e.target.checked })}
              className="w-4 h-4 rounded text-amber-600"
            />
            <label htmlFor="set_maint" className="cursor-pointer font-semibold">
              Mark Room status as 'Under Maintenance' (blocks new allocations)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Create Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: UPDATE TASK (ASSIGN / RESOLVE / RECORD EXPENSE)  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={`Update Maintenance Task #${selectedTask?.id}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status *</label>
            <select
              value={updateForm.status}
              onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Technician</label>
            <input
              type="text"
              value={updateForm.assigned_to}
              onChange={(e) => setUpdateForm({ ...updateForm, assigned_to: e.target.value })}
              placeholder="e.g. Sunil Electrician"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Repair Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={updateForm.cost}
                onChange={(e) => setUpdateForm({ ...updateForm, cost: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Completion Date</label>
              <input
                type="date"
                value={updateForm.completed_date}
                onChange={(e) => setUpdateForm({ ...updateForm, completed_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {updateForm.status === 'Completed' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
              <input
                type="checkbox"
                id="restore_room"
                checked={updateForm.restore_room_status}
                onChange={(e) => setUpdateForm({ ...updateForm, restore_room_status: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <label htmlFor="restore_room" className="cursor-pointer font-semibold">
                Automatically restore room status to Available/Full
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Save Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;

