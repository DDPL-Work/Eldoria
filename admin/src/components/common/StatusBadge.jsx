import React from 'react';
import { ST, ENQ_ST, APPR } from '../../constants/data';

export function StatusBadge({ status, type = 'booking', className = '' }) {
  if (type === 'source') {
    const s = String(status || 'App').toLowerCase();
    const isWa = s.includes('wa') || s.includes('whatsapp');
    const isCall = s.includes('call') || s.includes('phone');
    const colorClasses = isWa
      ? 'bg-[#E3F4EA] text-[#1E6B42]'
      : isCall
      ? 'bg-[#FDF0D9] text-[#8A5000]'
      : 'bg-[#E4ECF7] text-[#0E2F5A]';

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${colorClasses} ${className}`}
      >
        {status || 'App'}
      </span>
    );
  }

  if (type === 'enquiry') {
    const item = ENQ_ST[status] || [status || 'New', 'bg-[#FDF0D9] text-[#8A5000]'];
    const [label, cls] = item;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${cls} ${className}`}
      >
        {label}
      </span>
    );
  }

  if (type === 'onboarding') {
    const item = APPR[status] || [status || 'Under review', 'bg-[#FDF0D9] text-[#8A5000]'];
    const [label, cls] = item;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${cls} ${className}`}
      >
        {label}
      </span>
    );
  }

  // Booking status default
  const config = ST[status] || { label: status || 'Unknown', cls: 'bg-slate-100 text-slate-800' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${config.cls} ${className}`}
    >
      {config.label}
    </span>
  );
}

