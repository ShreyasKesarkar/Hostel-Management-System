/**
 * Rooms & Allocation Management Page Component
 *
 * Implements the core hostel room inventory and allocation logic:
 * - View rooms in grid card view or compact table view
 * - Filter by block, floor, room type, and status (available, full, maintenance)
 * - Add/Edit/Delete rooms
 * - Assign bed to student with strict capacity validation
 * - Room Transfer: seamless bed transfer from old room to new room
 * - Vacate bed: frees up bed capacity and updates room status
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  BedDouble,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Edit2,
  Trash2,
  UserPlus,
  ArrowRightLeft,
  LogOut,
  Building,
  Users,
  Eye,
  CheckCircle2,
  Info
} from 'lucide-react';

const RoomsPage = () => {
  const { isAdmin, isStaff } = useAuth();

  // Component state
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filter state
  const [blockFilter, setBlockFilter] = useState('All');
  const [floorFilter, setFloorFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal visibility state
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isEditRoomModalOpen, setIsEditRoomModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isViewRoomModalOpen, setIsViewRoomModalOpen] = useState(false);

  // Selected room / occupant state
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);

  // Form data for Room Add/Edit
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    block: 'A',
    floor: '1',
    room_type: 'Double',
    capacity: 2,
    fee_per_semester: 18000,
    status: 'available'
  });

  // Form data for Allocation
  const [allocateForm, setAllocateForm] = useState({
    student_id: '',
    room_id: '',
    bed_number: '',
    allocation_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // Form data for Transfer
  const [transferForm, setTransferForm] = useState({
    student_id: '',
    new_room_id: '',
    new_bed_number: '',
    transfer_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Initial load
  useEffect(() => {
    fetchRooms();
    fetchStudents();
  }, [blockFilter, floorFilter, typeFilter, statusFilter]);

  // Fetch rooms from backend
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = {};
      if (blockFilter !== 'All') params.block = blockFilter;
      if (floorFilter !== 'All') params.floor = floorFilter;
      if (typeFilter !== 'All') params.room_type = typeFilter;
      if (statusFilter !== 'All') params.status = statusFilter;

      const response = await api.get('/rooms', { params });
      if (response.data && response.data.success) {
        setRooms(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      setAlert({ type: 'error', message: 'Failed to load rooms.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch students for allocation dropdowns
  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      if (response.data && response.data.success) {
        setStudents(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  // Open Room Details Modal
  const handleViewRoom = async (room) => {
    try {
      const response = await api.get(`/rooms/${room.id}`);
      if (response.data && response.data.success) {
        setRoomDetails(response.data.data);
        setIsViewRoomModalOpen(true);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load room occupants.' });
    }
  };

  // Open Allocate Modal for a specific room
  const handleOpenAllocate = (room) => {
    setSelectedRoom(room);
    setAllocateForm({
      student_id: '',
      room_id: room.id,
      bed_number: `Bed-${(room.occupied_beds || 0) + 1}`,
      allocation_date: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setIsAllocateModalOpen(true);
  };

  // Open Edit Room Modal
  const handleOpenEdit = (room) => {
    setSelectedRoom(room);
    setRoomForm({
      room_number: room.room_number,
      block: room.block,
      floor: room.floor.toString(),
      room_type: room.room_type,
      capacity: room.capacity,
      fee_per_semester: room.fee_per_semester,
      status: room.status
    });
    setIsEditRoomModalOpen(true);
  };

  // Open Transfer Modal for an occupant in a room
  const handleOpenTransfer = (occupant, fromRoom) => {
    setTransferForm({
      student_id: occupant.student_id,
      new_room_id: '',
      new_bed_number: '',
      transfer_date: new Date().toISOString().split('T')[0],
      reason: ''
    });
    setIsTransferModalOpen(true);
  };

  // Handle Vacating a student bed
  const handleVacateStudent = async (allocationId, studentName) => {
    if (!window.confirm(`Are you sure you want to vacate ${studentName} from this room?`)) {
      return;
    }

    try {
      const response = await api.post(`/allocations/${allocationId}/vacate`, {
        vacating_date: new Date().toISOString().split('T')[0]
      });
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsViewRoomModalOpen(false);
        fetchRooms();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to vacate bed.' });
    }
  };

  // Submit Add Room
  const handleAddRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/rooms', roomForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsAddRoomModalOpen(false);
        fetchRooms();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to create room.' });
    }
  };

  // Submit Edit Room
  const handleEditRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/rooms/${selectedRoom.id}`, roomForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsEditRoomModalOpen(false);
        fetchRooms();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update room.' });
    }
  };

  // Submit Room Allocation
  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/allocations', allocateForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsAllocateModalOpen(false);
        fetchRooms();
        fetchStudents();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to allocate room.' });
    }
  };

  // Submit Room Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/allocations/transfer', transferForm);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsTransferModalOpen(false);
        setIsViewRoomModalOpen(false);
        fetchRooms();
        fetchStudents();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to transfer room.' });
    }
  };

  // Delete Room Confirmation
  const handleDeleteRoomConfirm = async () => {
    try {
      const response = await api.delete(`/rooms/${selectedRoom.id}`);
      if (response.data && response.data.success) {
        setAlert({ type: 'success', message: response.data.message });
        setIsDeleteModalOpen(false);
        fetchRooms();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete room.' });
      setIsDeleteModalOpen(false);
    }
  };

  // Filter students who are not yet allocated to any room
  const unallocatedStudents = students.filter((s) => !s.room_number);

  // Filter available target rooms for transfer
  const availableTargetRooms = rooms.filter((r) => r.status !== 'full' && r.status !== 'maintenance' && r.available_beds > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Room Inventory & Allocations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage block capacities, bed allocation, and student transfers</p>
        </div>
        {isStaff && (
          <button
            onClick={() => {
              setRoomForm({
                room_number: '',
                block: 'A',
                floor: '1',
                room_type: 'Double',
                capacity: 2,
                fee_per_semester: 18000,
                status: 'available'
              });
              setIsAddRoomModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room</span>
          </button>
        )}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Block */}
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          >
            <option value="All">All Blocks</option>
            <option value="A">Block A</option>
            <option value="B">Block B</option>
            <option value="C">Block C</option>
          </select>

          {/* Floor */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          >
            <option value="All">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
          </select>

          {/* Room Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          >
            <option value="All">All Types</option>
            <option value="Single">Single Bed</option>
            <option value="Double">Double Sharing</option>
            <option value="Triple">Triple Sharing</option>
            <option value="Four-Bed">Four Bed</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available</option>
            <option value="full">Full</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs transition ${
              viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500'
            }`}
            title="Card Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs transition ${
              viewMode === 'table' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. GRID CARD VIEW                                        */}
      {/* ======================================================== */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isFull = room.status === 'full' || (room.occupied_beds >= room.capacity);
            const isMaint = room.status === 'maintenance';

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Block {room.block} • Floor {room.floor}
                      </span>
                      <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{room.room_number}</h3>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Room Type:</span>
                      <span className="font-semibold text-slate-700">{room.room_type}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Semester Fee:</span>
                      <span className="font-semibold text-slate-700">₹{room.fee_per_semester?.toLocaleString()}</span>
                    </div>

                    {/* Bed capacity visual dots */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
                        <span className="text-slate-500">Beds: {room.occupied_beds || 0} / {room.capacity} occupied</span>
                        <span className="text-emerald-600 font-bold">{room.available_beds || 0} free</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isFull ? 'bg-slate-400' : isMaint ? 'bg-amber-400' : 'bg-blue-600'
                          }`}
                          style={{
                            width: `${Math.min(100, ((room.occupied_beds || 0) / room.capacity) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleViewRoom(room)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Occupants</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {isStaff && !isFull && !isMaint && (
                      <button
                        onClick={() => handleOpenAllocate(room)}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1"
                        title="Allocate student to this room"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Allocate</span>
                      </button>
                    )}

                    {isStaff && (
                      <button
                        onClick={() => handleOpenEdit(room)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title="Edit Room"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* 2. TABLE VIEW                                            */
        /* ======================================================== */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Room No</th>
                  <th className="py-3 px-4">Block & Floor</th>
                  <th className="py-3 px-4">Room Type</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Occupancy</th>
                  <th className="py-3 px-4">Fee / Sem</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">{room.room_number}</td>
                    <td className="py-3 px-4 text-slate-600">
                      Block {room.block}, Floor {room.floor}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{room.room_type}</td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{room.capacity} Beds</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-blue-600">{room.occupied_beds || 0}</span>
                      <span className="text-slate-400"> / {room.capacity} ({room.available_beds || 0} free)</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">₹{room.fee_per_semester?.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={room.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewRoom(room)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View occupants"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isStaff && room.status !== 'full' && room.status !== 'maintenance' && room.available_beds > 0 && (
                          <button
                            onClick={() => handleOpenAllocate(room)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Allocate student"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        {isStaff && (
                          <button
                            onClick={() => handleOpenEdit(room)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Delete"
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
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD ROOM                                        */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddRoomModalOpen}
        onClose={() => setIsAddRoomModalOpen(false)}
        title="Add New Room"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddRoomSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. A-301"
              value={roomForm.room_number}
              onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Block *</label>
              <select
                value={roomForm.block}
                onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="A">Block A</option>
                <option value="B">Block B</option>
                <option value="C">Block C</option>
                <option value="D">Block D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Floor *</label>
              <select
                value={roomForm.floor}
                onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="1">1st Floor</option>
                <option value="2">2nd Floor</option>
                <option value="3">3rd Floor</option>
                <option value="4">4th Floor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
              <select
                value={roomForm.room_type}
                onChange={(e) => {
                  const type = e.target.value;
                  const caps = { Single: 1, Double: 2, Triple: 3, 'Four-Bed': 4 };
                  setRoomForm({
                    ...roomForm,
                    room_type: type,
                    capacity: caps[type] || 2
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Triple">Triple</option>
                <option value="Four-Bed">Four-Bed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (Beds) *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Fee (₹)</label>
            <input
              type="number"
              value={roomForm.fee_per_semester}
              onChange={(e) => setRoomForm({ ...roomForm, fee_per_semester: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddRoomModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Create Room
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: EDIT ROOM                                       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditRoomModalOpen}
        onClose={() => setIsEditRoomModalOpen(false)}
        title={`Edit Room: ${selectedRoom?.room_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditRoomSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number *</label>
            <input
              type="text"
              required
              value={roomForm.room_number}
              onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (Beds) *</label>
              <input
                type="number"
                min="1"
                required
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={roomForm.status}
                onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="available">Available</option>
                <option value="full">Full</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Per Semester (₹)</label>
            <input
              type="number"
              value={roomForm.fee_per_semester}
              onChange={(e) => setRoomForm({ ...roomForm, fee_per_semester: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditRoomModalOpen(false)}
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
      {/* MODAL 3: VIEW OCCUPANTS & ROOM DETAILS                   */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewRoomModalOpen}
        onClose={() => setIsViewRoomModalOpen(false)}
        title={`Room ${roomDetails?.room_number} Occupants & Details`}
        maxWidth="max-w-2xl"
      >
        {roomDetails && (
          <div className="space-y-5 text-xs md:text-sm">
            {/* Header info */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div>
                <span className="text-xs text-slate-500 block">
                  Block {roomDetails.block} • Floor {roomDetails.floor} • {roomDetails.room_type}
                </span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  {roomDetails.occupied_beds || 0} / {roomDetails.capacity} Beds Occupied
                </span>
              </div>
              <StatusBadge status={roomDetails.status} />
            </div>

            {/* Current Occupants list */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Current Student Occupants</h4>
              {roomDetails.occupants && roomDetails.occupants.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {roomDetails.occupants.map((occ) => (
                    <div key={occ.allocation_id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {occ.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{occ.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {occ.enrollment_no} • {occ.department} (Year {occ.year}) • {occ.bed_number}
                          </p>
                        </div>
                      </div>

                      {isStaff && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenTransfer(occ, roomDetails)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                            title="Transfer student to another room"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Transfer</span>
                          </button>
                          <button
                            onClick={() => handleVacateStudent(occ.allocation_id, occ.name)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                            title="Vacate bed"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Vacate</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No students currently allocated to this room.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: ALLOCATE STUDENT TO ROOM                        */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title={`Allocate Bed in Room ${selectedRoom?.room_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAllocateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
            <select
              required
              value={allocateForm.student_id}
              onChange={(e) => setAllocateForm({ ...allocateForm, student_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">-- Choose unallocated student --</option>
              {unallocatedStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.enrollment_no} - {st.department})
                </option>
              ))}
            </select>
            {unallocatedStudents.length === 0 && (
              <span className="text-[11px] text-amber-600 block mt-1">
                All registered students are currently allocated!
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bed Label *</label>
            <input
              type="text"
              required
              value={allocateForm.bed_number}
              onChange={(e) => setAllocateForm({ ...allocateForm, bed_number: e.target.value })}
              placeholder="e.g. Bed-1 or Bed-A"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Allocation Date *</label>
            <input
              type="date"
              required
              value={allocateForm.allocation_date}
              onChange={(e) => setAllocateForm({ ...allocateForm, allocation_date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              value={allocateForm.remarks}
              onChange={(e) => setAllocateForm({ ...allocateForm, remarks: e.target.value })}
              placeholder="e.g. Assigned on admission request"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAllocateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={unallocatedStudents.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm Allocation
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: TRANSFER STUDENT ROOM                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Student Room"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Target Room *</label>
            <select
              required
              value={transferForm.new_room_id}
              onChange={(e) => setTransferForm({ ...transferForm, new_room_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">-- Choose destination room with free beds --</option>
              {availableTargetRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} (Block {r.block}, {r.room_type} - {r.available_beds} beds free)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Bed Number</label>
            <input
              type="text"
              placeholder="e.g. Bed-1"
              value={transferForm.new_bed_number}
              onChange={(e) => setTransferForm({ ...transferForm, new_bed_number: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Date *</label>
            <input
              type="date"
              required
              value={transferForm.transfer_date}
              onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Transfer</label>
            <input
              type="text"
              value={transferForm.reason}
              onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
              placeholder="e.g. Student requested quieter block"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Execute Transfer
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 6: DELETE ROOM CONFIRMATION                        */}
      {/* ======================================================== */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRoomConfirm}
        title="Delete Room Record"
        message={`Are you sure you want to delete Room ${selectedRoom?.room_number}? You can only delete rooms that have no active student allocations.`}
        confirmText="Confirm Delete"
      />
    </div>
  );
};

export default RoomsPage;

