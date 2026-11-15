/**
 * Dashboard Page Component
 *
 * Renders key hostel performance indicators:
 * - Real-time statistics from backend SQLite database
 * - Occupancy progress bar and bed availability
 * - Grievance breakdown by category
 * - Financial fee collection overview
 * - Audit activity log stream
 *
 * Automatically adapts between Staff (Admin/Warden) view and Student view.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  BedDouble,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  UserCheck,
  Wrench,
  ArrowRight,
  TrendingUp,
  Building,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const { user, isStudent } = useAuth();

  // useState hook holds dashboard metrics returned by the backend
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // useEffect hook executes once when component mounts to fetch dashboard statistics
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Fetches aggregated metrics from GET /api/dashboard/stats
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/stats');
      if (response.data && response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Failed to load dashboard statistics. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading hostel metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
        {error}
      </div>
    );
  }

  // ==========================================
  // 1. STUDENT PERSONALIZED DASHBOARD VIEW
  // ==========================================
  if (isStudent) {
    const { roomInfo, roommates, complaints, fees, activeVisitors, recentComplaints } = stats || {};

    return (
      <div className="space-y-6">
        {/* Welcome greeting banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm">
          <h2 className="text-xl md:text-2xl font-bold">Welcome back, {user?.fullName || user?.username}!</h2>
          <p className="text-blue-100 text-xs md:text-sm mt-1">
            Student Residential Dashboard • Department of {user?.studentProfile?.department || 'Academics'}
          </p>
        </div>

        {/* Room Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">My Room Allocation</h3>
                <p className="text-xs text-slate-500">Hostel residency details</p>
              </div>
            </div>
            {roomInfo ? (
              <StatusBadge status="active" />
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                Not Allocated
              </span>
            )}
          </div>

          {roomInfo ? (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Room Number</span>
                <span className="text-lg font-bold text-slate-800 mt-0.5 block">{roomInfo.room_number}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Block & Floor</span>
                <span className="text-lg font-bold text-slate-800 mt-0.5 block">
                  Block {roomInfo.block}, Floor {roomInfo.floor}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Assigned Bed</span>
                <span className="text-lg font-bold text-blue-600 mt-0.5 block">{roomInfo.bed_number || 'Bed 1'}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Room Type</span>
                <span className="text-lg font-bold text-slate-800 mt-0.5 block">{roomInfo.room_type}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              You are not currently allocated a room. Please contact the hostel warden for assignment.
            </div>
          )}

          {/* Roommates listing */}
          {roommates && roommates.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Roommates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roommates.map((rm, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{rm.name}</p>
                      <p className="text-xs text-slate-500">{rm.department} • Year {rm.year}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {rm.bed_number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Student Quick Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Pending Dues"
            value={`₹${fees?.totalPending || 0}`}
            subtitle={fees?.totalPending > 0 ? 'Payment required' : 'All semester fees cleared'}
            icon={Receipt}
            color={fees?.totalPending > 0 ? 'amber' : 'emerald'}
          />

          <StatCard
            title="Active Complaints"
            value={complaints?.pending || 0}
            subtitle={`${complaints?.resolved || 0} complaints resolved`}
            icon={AlertTriangle}
            color={complaints?.pending > 0 ? 'rose' : 'slate'}
          />

          <StatCard
            title="Active Visitors"
            value={activeVisitors || 0}
            subtitle="Currently checked-in"
            icon={UserCheck}
            color="blue"
          />
        </div>

        {/* Recent Complaints by Student */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">My Recent Complaints</h3>
              <p className="text-xs text-slate-500">Track the resolution progress of your tickets</p>
            </div>
            <Link
              to="/complaints"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentComplaints && recentComplaints.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentComplaints.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.category} • Submitted on {new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No complaints submitted yet.</p>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. ADMIN & WARDEN COMPLETE DASHBOARD VIEW
  // ==========================================
  const { rooms, students, complaints, fees, visitors, maintenance, recentActivities } = stats || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Hostel Operations Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status of rooms, students, grievances, and finances</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Database Live (SQLite)
          </span>
        </div>
      </div>

      {/* Primary Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Rooms"
          value={rooms?.total || 0}
          subtitle={`${rooms?.occupied || 0} occupied • ${rooms?.available || 0} available`}
          icon={Building}
          color="blue"
        />

        <StatCard
          title="Total Students"
          value={students?.total || 0}
          subtitle={`${students?.allocated || 0} allocated • ${students?.unallocated || 0} unallocated`}
          icon={Users}
          color="purple"
        />

        <StatCard
          title="Pending Complaints"
          value={complaints?.pending || 0}
          subtitle={`${complaints?.inProgress || 0} in progress • ${complaints?.resolved || 0} resolved`}
          icon={AlertTriangle}
          color={complaints?.pending > 0 ? 'amber' : 'emerald'}
        />

        <StatCard
          title="Pending Fees"
          value={`₹${fees?.totalPending?.toLocaleString() || 0}`}
          subtitle={`${fees?.pendingCount || 0} students with outstanding balance`}
          icon={Receipt}
          color="rose"
        />
      </div>

      {/* Secondary Highlights: Bed Occupancy & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room & Bed Occupancy Visual */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Bed Occupancy</h3>
              <p className="text-xs text-slate-500">Live capacity utilization</p>
            </div>
            <span className="text-xl font-extrabold text-blue-600">{rooms?.occupancyRate || 0}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, rooms?.occupancyRate || 0)}%` }}
            ></div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Occupied Beds</span>
              <span className="text-base font-bold text-slate-800 mt-0.5 block">{rooms?.occupiedBeds || 0}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block">Available Beds</span>
              <span className="text-base font-bold text-emerald-600 mt-0.5 block">{rooms?.availableBeds || 0}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Bed Capacity: {rooms?.totalCapacity || 0}</span>
            <Link to="/rooms" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <span>Manage Rooms</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Complaints Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Complaints by Category</h3>
              <p className="text-xs text-slate-500">Maintenance & service issues</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {complaints?.total || 0} Total
            </span>
          </div>

          <div className="space-y-3">
            {complaints?.byCategory && complaints.byCategory.length > 0 ? (
              complaints.byCategory.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{cat.count}</span>
                    <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (cat.count / (complaints.total || 1)) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No complaints recorded</p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Pending Resolution: {complaints?.pending || 0}</span>
            <Link to="/complaints" className="text-blue-600 font-semibold hover:underline">
              Resolve Issues
            </Link>
          </div>
        </div>

        {/* Quick Operations Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-1">Campus Activity Snapshot</h3>
          <p className="text-xs text-slate-500 mb-4">Visitors and facilities overview</p>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-800">Active Visitors</span>
              </div>
              <span className="font-extrabold text-blue-700 text-sm">{visitors?.activeCount || 0}</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-800">Pending Maintenance</span>
              </div>
              <span className="font-extrabold text-amber-700 text-sm">{maintenance?.pending || 0}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">Total Fees Collected</span>
              </div>
              <span className="font-extrabold text-emerald-700 text-sm">
                ₹{fees?.totalCollected?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs flex justify-between text-slate-500">
            <span>Maintenance cost: ₹{maintenance?.totalCost || 0}</span>
            <Link to="/visitors" className="text-blue-600 font-semibold hover:underline">
              Visitor Gate Pass
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activities Audit Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">Recent Audit Activities</h3>
              <p className="text-xs text-slate-500">Automatic logging of administrative and operational actions</p>
            </div>
          </div>
        </div>

        {recentActivities && recentActivities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Module</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-4">Performed By</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivities.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{log.details}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{log.user_name}</td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">No activity logs recorded yet.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

