import React, { useEffect } from 'react';

export function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      onClose();
    }, 3200);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-xl text-sm font-medium border border-slate-700/60 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-sm">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
      <span className="grow">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
        aria-label="Dismiss toast"
      >
        ✕
      </button>
    </div>
  );
}
