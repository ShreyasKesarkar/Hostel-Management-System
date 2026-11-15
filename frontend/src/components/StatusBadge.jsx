/**
 * StatusBadge Component
 *
 * Renders consistent, clean, color-coded badges for statuses across the application
 * (complaints, fees, room allocations, rooms, and visitors).
 */

import React from 'react';

const StatusBadge = ({ status }) => {
  if (!status) return null;

  // Map status strings to modern Tailwind color styles
  const getBadgeStyle = (val) => {
    switch (val.toLowerCase()) {
      // Positive / Active states
      case 'paid':
      case 'resolved':
      case 'completed':
      case 'available':
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      // Pending / Warning states
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      // In Progress / Partial states
      case 'in progress':
      case 'partially paid':
      case 'checked in':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      // Inactive / Full / Danger states
      case 'full':
      case 'maintenance':
      case 'checked out':
      case 'vacated':
      case 'transferred':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {status}
    </span>
  );
};

export default StatusBadge;

