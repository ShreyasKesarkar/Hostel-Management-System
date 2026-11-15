/**
 * Alert Notification Component
 *
 * Displays success, error, info, and warning banners with clear icons and dismiss buttons.
 */

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  const styles = {
    success: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
    },
    error: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-500 mr-3 flex-shrink-0" />
    },
    info: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
    },
    warning: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <AlertCircle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />
    }
  };

  const current = styles[type] || styles.info;

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between mb-4 shadow-sm ${current.bg}`}>
      <div className="flex items-center text-sm font-medium">
        {current.icon}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;

