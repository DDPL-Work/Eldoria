import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { fmtDate } from '../../constants/data';
import { useStore } from '../../context/StoreContext';

export function NewReqPopup({ onOpenBooking }) {
  const { inCity, bookingsAll, svcB, cityName, bCity } = useStore();
  const [dismissed, setDismissed] = useState(new Set());

  const requests = inCity(bookingsAll()).filter(
    (b) => b.status === 'requested' && !dismissed.has(b.id)
  );

  if (requests.length === 0) return null;
  const current = requests[0];
  const s = svcB(current);

  const handleDismiss = (id) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <aside
      aria-label="New booking alert"
      className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-amber-500/40 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
          <Icon name="bell" size={20} strokeWidth={2.4} />
        </div>
        <div className="grow min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
              New Request
            </span>
            <span className="text-xs text-slate-400 font-mono">{current.code}</span>
          </div>
          <p className="font-bold text-white text-sm truncate mt-0.5">
            {current.clientName} for {current.patientName}
          </p>
          <p className="text-xs text-slate-300 mt-0.5 truncate">
            {s.name} · {cityName(bCity(current))} · {fmtDate(current.date)}, {current.time}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => onOpenBooking(current.id)}
              className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition text-center cursor-pointer"
            >
              Review request
            </button>
            <button
              type="button"
              onClick={() => handleDismiss(current.id)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
