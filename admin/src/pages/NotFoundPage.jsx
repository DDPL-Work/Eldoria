import React from 'react';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 font-black text-2xl flex items-center justify-center border border-amber-200">
        404
      </div>
      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md">
        The care desk route you requested does not exist or has been moved.
      </p>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
