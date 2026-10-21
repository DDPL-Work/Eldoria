import React from 'react';
import { RiRefreshLine } from 'react-icons/ri';

/**
 * Standard Database Fetching Loader across all Admin Pages
 * Matches the Eldoria Design System with smooth spinning indicator and clear status labels
 */
export function DatabaseLoader({
  title = 'Fetching Data from Database...',
  subtitle = 'Connecting to Eldoria backend server',
  className = 'py-20',
  cardWrap = false,
}) {
  const content = (
    <div className={`text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#0E2F5A]/5 flex items-center justify-center">
        <RiRefreshLine className="animate-spin text-2xl text-[#0E2F5A]" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );

  if (cardWrap) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {content}
      </div>
    );
  }

  return content;
}

export default DatabaseLoader;
