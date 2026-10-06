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
      onNavigateTarget('enquiries', n.enqId);
    } else if (n.appId) {
      onNavigateTarget('onboarding', n.appId);
    } else if (n.bookingId) {
      onNavigateTarget('bookings', n.bookingId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-500 font-medium">
            System logs, new requests, cancellations and visit completions
          </p>
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 text-sm">No notifications</p>
            <p className="text-xs">
              New customer requests, caregiver updates and alerts appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={`w-full p-4 sm:px-6 flex items-start justify-between gap-4 text-left transition cursor-pointer hover:bg-slate-50/70 ${
                  !n.read ? 'bg-teal-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                      !n.read ? 'bg-teal-600' : 'bg-transparent border border-slate-300'
                    }`}
                  />
                  <div>
                    <h2
                      className={`text-sm truncate ${
                        !n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {n.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-400 shrink-0 whitespace-nowrap">
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
