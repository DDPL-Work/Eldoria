import React from 'react';
import { ST, ENQ_ST, APPR } from '../../constants/data';

export function StatusBadge({ status, type = 'booking', className = '' }) {
  if (type === 'source') {
    const isWa = status === 'WhatsApp';
    const isCall = status === 'Call';
    const colorClasses = isWa
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : isCall
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClasses} ${className}`}
      >
        {status || 'App'}
      </span>
    );
  }

  if (type === 'enquiry') {
    const item = ENQ_ST[status] || [status || 'New', 'bg-slate-100 text-slate-800'];
    const [label, cls] = item;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-transparent ${cls} ${className}`}
      >
        {label}
      </span>
    );
  }

  if (type === 'onboarding') {
    const item = APPR[status] || [status || 'Under review', 'bg-slate-100 text-slate-800'];
    const [label, cls] = item;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-transparent ${cls} ${className}`}
      >
        {label}
      </span>
    );
  }

  // Booking status default
  const config = ST[status] || { label: status || 'Unknown', cls: 'bg-slate-100 text-slate-800' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-transparent ${config.cls} ${className}`}
    >
      {config.label}
    </span>
  );
}
