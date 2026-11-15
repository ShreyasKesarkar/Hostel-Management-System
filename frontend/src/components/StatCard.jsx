/**
 * StatCard Component
 *
 * Displays a clean SaaS-style metric card with an icon, numeric value,
 * descriptive label, and optional subtle footer trend/note.
 */

import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
  // Determine accent color schemes
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100'
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-100'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${scheme.bg} ${scheme.text} border ${scheme.border}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {subtitle && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default StatCard;

