import { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';
import { fmtDate } from '../../constants/data';
import { useStore } from '../../store';

const STORAGE_KEY = 'eldoria_dismissed_booking_requests';

function getStoredDismissed() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function NewReqPopup({ onOpenBooking, delay = 3500 }) {
  const { inCity, bookingsAll, backendBookings, svcB, cityName, bCity } = useStore();
  const [dismissed, setDismissed] = useState(getStoredDismissed);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const allBookings =
    Array.isArray(backendBookings) && backendBookings.length > 0
      ? backendBookings
      : bookingsAll();

  // Filter requests that are in the selected city and not yet dismissed
  const requests = inCity(allBookings).filter((b) => {
    if (!b || b.status !== 'requested') return false;
    const id = b.id != null ? String(b.id) : null;
    const code = b.code != null ? String(b.code) : null;
    if (id && dismissed.has(id)) return false;
    if (code && dismissed.has(code)) return false;
    return true;
  });

  // Trigger smooth appearance after delay for un-dismissed requests
  useEffect(() => {
    if (requests.length === 0) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, requests.length]);

  if (requests.length === 0) return null;

  // Show the latest requested booking
  const current = requests[0];
  const s = svcB(current);
  const serviceName = current.serviceName || s?.name || current.service || 'Booking Request';
  const patientDisplay = current.patientName || current.clientName || 'Patient';
  const totalCount = requests.length;

  const saveDismissedIds = (ids) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(String(id)));
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch (err) {
        console.error('Failed to save dismissed requests', err);
      }
      return next;
    });
  };

  // When clicking "Later", dismiss ALL currently pending requests at once
  // so the user is not spammed 4 times for 4 requests!
  const handleDismissAll = () => {
    setIsClosing(true);
    setTimeout(() => {
      const allIds = [];
      requests.forEach((b) => {
        if (b.id != null) allIds.push(String(b.id));
        if (b.code != null) allIds.push(String(b.code));
      });
      saveDismissedIds(allIds);
      setIsClosing(false);
      setIsOpen(false);
    }, 400);
  };

  const handleView = () => {
    if (onOpenBooking) {
      onOpenBooking(current.id || current.code);
    }
    handleDismissAll();
  };

  // Format date and time cleanly
  const dateFormatted = fmtDate(current.date);
  const formattedWhen = dateFormatted
    ? `${dateFormatted}${current.time ? `, ${current.time}` : ''}`
    : (current.time || 'Scheduled visit');

  const cityDisplay = current.city || cityName(bCity(current)) || '';

  return (
    <aside
      aria-label="New booking alert"
      className={`fixed top-6 left-1/2 -translate-x-1/2 lg:left-[calc(50%+7.5rem)] z-50 w-[92%] sm:w-102.5 bg-[#0c1f36] text-white rounded-xl p-4 sm:p-5 shadow-md shadow-black/80 border-2 border-[#f59e0b] transform transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen && !isClosing
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'
      }`}
    >
      {/* Header Row with Icon and Title */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#f59e0b] text-[#0c1f36] flex items-center justify-center shrink-0 font-black shadow-xs">
          <Icon name="bell" size={19} strokeWidth={2.4} />
        </div>
        <div className="grow min-w-0">
          <div className="text-[11px] font-bold text-[#fdb813] tracking-wider uppercase leading-none">
            NEW BOOKING REQUEST · {totalCount} NEW
          </div>
          <h3 className="font-bold text-white text-sm sm:text-base leading-snug mt-1 truncate">
            {serviceName} · {patientDisplay}
            {current.patientAge ? `, ${current.patientAge}` : ''}
          </h3>
        </div>
      </div>

      {/* Booking Details */}
      <div className="mt-3 pl-0 text-slate-300 text-xs space-y-0.5">
        <p className="truncate">
          {formattedWhen}
          {cityDisplay ? ` · ${cityDisplay}` : ''}
          {current.plan ? ` · ${current.plan}` : ''}
        </p>
        <p className="truncate text-slate-300">
          {current.address || 'Address provided on booking'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 mt-4 pt-0.5">
        <button
          type="button"
          onClick={handleView}
          className="flex-1 py-2.5 px-4 rounded-lg bg-[#f59e0b] hover:bg-[#e69107] active:scale-[0.98] text-[#0c1f36] font-bold text-xs sm:text-sm transition text-center shadow-xs cursor-pointer select-none"
        >
          View request
        </button>
        <button
          type="button"
          onClick={handleDismissAll}
          className="py-2.5 px-5 rounded-lg bg-[#162d4a]/90 hover:bg-[#1f3c60] active:scale-[0.98] border border-slate-600/70 text-white font-medium text-xs sm:text-sm transition text-center cursor-pointer select-none"
        >
          Later
        </button>
      </div>
    </aside>
  );
}
