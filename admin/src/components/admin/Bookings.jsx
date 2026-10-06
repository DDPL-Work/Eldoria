import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { fmtDate, todayISO, ACTIVE } from '../../constants/data';

export function Bookings({ onOpenBooking, onNewBooking }) {
  const { inCity, bookingsAll, cityName, bCity, svcB, staffList, data } = useStore();
  const [filter, setFilter] = useState('active');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const filterFn = {
    active: (b) => ACTIVE.includes(b.status),
    requested: (b) => b.status === 'requested',
    today: (b) => b.date === todayISO(),
    completed: (b) => b.status === 'completed',
    cancelled: (b) => b.status === 'cancelled',
    all: () => true
  }[filter] || (() => true);

  const list = inCity(bookingsAll())
    .filter(filterFn)
    .filter(
      (b) =>
        !q ||
        [b.clientName, b.patientName, b.code, b.clientPhone, b.address]
          .join(' ')
          .toLowerCase()
          .includes(q)
    );

  const actorName = (actor) => {
    if (!actor || actor === 'admin') return 'Care desk';
    if (actor === 'client') return 'Family';
    if (actor.startsWith('staff:')) {
      const sid = actor.slice(6);
      return data.staff[sid]?.name || 'Staff';
    }
    return actor;
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bookings</h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage home visits, track caregiver assignments and update statuses
          </p>
        </div>
        <button
          type="button"
          onClick={onNewBooking}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition duration-150 self-start sm:self-auto cursor-pointer"
        >
          <Icon name="plus" size={16} strokeWidth={2.5} />
          <span>New booking</span>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            ['active', 'Active'],
            ['requested', 'New requests'],
            ['today', 'Today'],
            ['completed', 'Completed'],
            ['cancelled', 'Cancelled'],
            ['all', 'All']
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filter === k
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, code…"
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 focus:bg-white transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table Card */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 text-sm">No bookings here</p>
            <p className="text-xs">
              {filter === 'active'
                ? 'Requests from the client app and direct phone entries will appear here.'
                : 'Try selecting a different filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Booking</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">When</th>
                  <th className="py-3.5 px-4">Staff</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((b) => {
                  const s = svcB(b);
                  const st = data.staff[b.staffId];

                  return (
                    <tr
                      key={b.id}
                      onClick={() => onOpenBooking(b.id)}
                      className="hover:bg-teal-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-teal-700">
                          {b.clientName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs text-slate-400">{b.code}</span>
                          <StatusBadge status={b.source} type="source" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {cityName(bCity(b))}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 text-xs">{b.patientName}</div>
                        {b.patientAge && (
                          <div className="text-[11px] text-slate-400">{b.patientAge} yrs</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 text-xs">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{b.plan}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-800">
                          {fmtDate(b.date)}
                        </div>
                        <div className="text-[11px] text-slate-400">{b.time}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {st ? (
                          <div>
                            <span className="font-bold text-slate-800">{st.name}</span>
                            {b.assignedBy && b.assignedBy !== 'admin' && (
                              <div className="text-[11px] text-slate-400">
                                by {actorName(b.assignedBy)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400 font-medium">Not assigned</span>
                            {b.confirmedBy && b.confirmedBy !== 'admin' && (
                              <div className="text-[11px] text-slate-400">
                                confirmed by {actorName(b.confirmedBy)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <StatusBadge status={b.status} type="booking" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
