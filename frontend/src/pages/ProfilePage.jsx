/**
 * User Profile Page Component
 *
 * Allows authenticated users (Admin, Warden, Student) to:
 * - View personal account credentials and role privileges
 * - View student residential assignment info (for students)
 * - Update personal contact information
 * - Change account login password securely
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Alert from '../components/Alert';
import {
  User,
  Lock,
  Phone,
  Mail,
  Building,
  BedDouble,
  ShieldCheck,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

const ProfilePage = () => {
  const { user, refreshUser, isStudent } = useAuth();

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileAlert, setProfileAlert] = useState(null);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState(null);

  // Submit Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileAlert(null);

    try {
      setProfileLoading(true);
      const response = await api.put('/auth/profile', {
        fullName: fullName.trim(),
        phone: phone.trim()
      });

      if (response.data && response.data.success) {
        setProfileAlert({ type: 'success', message: 'Profile updated successfully.' });
        refreshUser();
      }
    } catch (err) {
      setProfileAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile.'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordAlert(null);

    if (newPassword.length < 6) {
      setPasswordAlert({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await api.put('/auth/change-password', {
        oldPassword,
        newPassword
      });

      if (response.data && response.data.success) {
        setPasswordAlert({ type: 'success', message: 'Password changed successfully.' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to change password.'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const studentProfile = user?.studentProfile;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Account & Profile Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manage your credentials, contact information, and security</p>
      </div>

      {/* Account Overview Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
          {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-lg font-bold text-slate-900">{user?.fullName || user?.username}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Username: @{user?.username} • Email: {user?.email}</p>
        </div>
      </div>

      {/* If student: Display Room & Academic Dossier */}
      {isStudent && studentProfile && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BedDouble className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-800">Student & Room Assignment Profile</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block">Enrollment No</span>
              <span className="font-mono font-bold text-slate-800 mt-0.5 block">{studentProfile.enrollment_no}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{studentProfile.department}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block">Current Room</span>
              <span className="font-bold text-blue-600 mt-0.5 block">
                {studentProfile.room_number ? `${studentProfile.room_number} (${studentProfile.bed_number})` : 'Unassigned'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block">Blood Group</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{studentProfile.blood_group || 'O+'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Edit Profile & Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form 1: Edit Contact Information */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Personal Details</h4>
          <p className="text-xs text-slate-500 mb-4">Update your display name and contact phone number</p>

          {profileAlert && (
            <Alert type={profileAlert.type} message={profileAlert.message} onClose={() => setProfileAlert(null)} />
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-400 block mt-1">Email is tied to your institutional ID</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {profileLoading ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Form 2: Change Password */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-800">Change Password</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">Ensure your account uses a secure passkey</p>

          {passwordAlert && (
            <Alert type={passwordAlert.type} message={passwordAlert.message} onClose={() => setPasswordAlert(null)} />
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {passwordLoading ? 'Updating Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

