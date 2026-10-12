import React from 'react';
import { useStore } from '../../context/StoreContext';
import { fmtTs } from '../../constants/data';

export function Alerts({ onNavigateTarget }) {
  const { notesFor, patch } = useStore();
  const list = notesFor('admin');
  const hasUnread = list.some((n) => !n.read);

  const handleMarkAllRead = () => {
    list
      .filter((n) => !n.read)
      .forEach((n) => patch('notifications', n.id, { read: true }));
  };

  const handleOpenNotification = (n) => {
    if (!n.read) {
      patch('notifications', n.id, { read: true });
    }

    if (n.enqId) {
      onNavigateTarget?.('enquiries', n.enqId);
    } else if (n.appId) {
      onNavigateTarget?.('onboarding', n.appId);
    } else if (n.staffId) {
      onNavigateTarget?.('staff', n.staffId);
    } else if (n.bookingId) {
      onNavigateTarget?.('bookings', n.bookingId);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-3">
      {/* 1. Header: Notifications Title on Left, Mark all read on Right */}
      <div className="flex items-center justify-between min-h-[36px]">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>

        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="h-8 px-3.5 inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition cursor-pointer select-none leading-none whitespace-nowrap"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* 2. Notifications Card Section */}
      <section className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <b className="block text-slate-800 text-sm font-bold">No notifications</b>
            <span className="text-xs text-slate-500">
              New requests, cancellations and completed visits are logged here.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[#E1E9F4]">
            {list.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={`w-full px-5 py-3.5 sm:px-6 sm:py-4 flex items-start justify-between gap-4 text-left transition cursor-pointer select-none ${
                  !n.read
                    ? 'bg-[#E4ECF7] hover:bg-[#d8e3f3]'
                    : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                    {n.body}
                  </div>
                </div>

                <span className="text-xs text-slate-400 font-medium shrink-0 whitespace-nowrap pt-0.5">
                  {fmtTs(n.at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
