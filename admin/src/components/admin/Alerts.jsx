import React from 'react';
import { useStore } from '../../context/StoreContext';
import { fmtTs } from '../../constants/data';
import noNotificationsImg from '../../assets/no-notifications.png';

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
          <div className="flex flex-col items-center justify-center px-4 py-8 sm:py-11 text-center bg-white min-h-[399px]">
            {/* Illustration */}
            <div className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] h-[190px] sm:h-[240px] md:h-[270px] flex items-center justify-center mb-3 shrink-0">
              <img
                src={noNotificationsImg}
                alt="No Notifications"
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            </div>

            {/* Main heading */}
            <h2 className="text-xl sm:text-2xl font-bold text-[#0E2F5A] tracking-tight mb-1.5">
              No notifications
            </h2>

            {/* Supporting description */}
            <p className="text-xs sm:text-sm text-slate-500 max-w-[500px] mx-auto px-2 leading-relaxed">
              New requests, cancellations and completed visits are logged here.
            </p>
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
