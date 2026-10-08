import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { fmtDate, todayISO, ACTIVE } from '../../constants/data';

export function Bookings({ onOpenBooking, onNewBooking }) {
  const {
    inCity,
    bookingsAll,
    cityName,
    bCity,
    svcB,
    data,
    selectedCity,
    setSelectedCity,
    cities
  } = useStore();

  const [filter, setFilter] = useState('active');
  const [query, setQuery] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="p-3.5 sm:p-4 max-w-[1440px] mx-auto space-y-3">
      {/* 1. TOP CITY SELECTOR DROPDOWN (Matches Reference Screenshot) */}
      <div className="flex items-center justify-between">
        <div className="relative inline-block" ref={cityDropdownRef}>
          <button
            type="button"
            onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-1.5 shadow-2xs transition cursor-pointer select-none"
            aria-expanded={cityDropdownOpen}
            aria-haspopup="true"
          >
            <Icon name="pin" size={15} className="text-slate-500" />
            <span className="text-slate-500 text-xs sm:text-sm font-medium">City</span>
            <span className="text-slate-900 text-xs sm:text-sm font-bold ml-0.5">
              {selectedCity === 'all' ? 'All cities' : cityName(selectedCity)}
            </span>
            <Icon name="down" size={13} className="text-slate-500 ml-1" />
          </button>

          {cityDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedCity('all');
                  setCityDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  selectedCity === 'all'
                    ? 'bg-slate-50 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>All cities</span>
                {selectedCity === 'all' && <span className="text-[#0E2F5A] font-bold">✓</span>}
              </button>
              <div className="h-px bg-slate-100 my-1" />
              {cities().map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCity(c.id);
                    setCityDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                    selectedCity === c.id
                      ? 'bg-slate-50 text-slate-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{c.name}</span>
                  {selectedCity === c.id && <span className="text-[#0E2F5A] font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. HEADER: Bookings Title & + New Booking Button */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bookings</h1>
        <button
          type="button"
          onClick={onNewBooking}
          className="bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition shrink-0 cursor-pointer"
        >
          <span className="text-base leading-none font-black">+</span>
          <span>New booking</span>
        </button>
      </div>

      {/* 3. TOOLS: Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
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
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] whitespace-nowrap transition cursor-pointer select-none ${
                filter === k
                  ? 'bg-[#E4ECF7] border-2 border-[#0E2F5A] text-[#0E2F5A] font-extrabold shadow-2xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 font-semibold shadow-2xs'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, code"
            aria-label="Search bookings"
            className="w-full sm:w-[280px] bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] shadow-2xs transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. BOOKINGS TABLE CARD */}
      <section className="bg-white rounded-md overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="font-bold text-slate-800 text-sm">No bookings here</p>
            <p className="text-xs text-slate-500">
              {filter === 'active'
                ? 'Requests from the client app and direct phone entries will appear here.'
                : 'Try selecting a different filter.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full text-left text-xs table-fixed">
              <thead>
                <tr className="bg-[#dfe4e9] text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 pl-4 pr-2 w-[20%]">BOOKING</th>
                  <th className="py-2.5 px-2 w-[8%]">CITY</th>
                  <th className="py-2.5 px-2 w-[14%]">PATIENT</th>
                  <th className="py-2.5 px-2 w-[15%]">SERVICE</th>
                  <th className="py-2.5 px-2 w-[11%]">WHEN</th>
                  <th className="py-2.5 px-2 w-[15%]">STAFF</th>
                  <th className="py-2.5 pl-2 pr-4 w-[18%] text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {list.map((b) => {
                  const s = svcB(b);
                  const st = data.staff[b.staffId];
                  const isToday = b.date === todayISO();
                  const whenDate = isToday ? 'Today' : fmtDate(b.date);

                  return (
                    <tr
                      key={b.id}
                      onClick={() => onOpenBooking(b.id)}
                      className="hover:bg-slate-50/60 transition cursor-pointer group"
                    >
                      {/* BOOKING Column */}
                      <td className="py-3 pl-4 pr-2">
                        <div className="font-bold text-slate-900 group-hover:text-[#0E2F5A] text-xs sm:text-[13px] leading-snug truncate">
                          {b.clientName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 leading-snug">
                          <span className="font-mono text-slate-400">{b.code}</span>
                          <span>·</span>
                          <StatusBadge status={b.source} type="source" />
                        </div>
                      </td>

                      {/* CITY Column */}
                      <td className="py-3 px-2 text-xs font-medium text-slate-700 truncate">
                        {cityName(bCity(b))}
                      </td>

                      {/* PATIENT Column */}
                      <td className="py-3 px-2 text-xs font-medium text-slate-800">
                        <div className="truncate">
                          {b.patientName}{b.patientAge ? `, ${b.patientAge}` : ''}
                        </div>
                      </td>

                      {/* SERVICE Column */}
                      <td className="py-3 px-2">
                        <div className="font-medium text-slate-800 text-xs sm:text-[13px] leading-snug truncate">
                          {svcB(b).name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug truncate">
                          {b.plan || 'Single visit'}
                        </div>
                      </td>

                      {/* WHEN Column */}
                      <td className="py-3 px-2">
                        <div className="text-xs font-medium text-slate-800 leading-snug whitespace-nowrap">
                          {whenDate}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug whitespace-nowrap">
                          {b.time}
                        </div>
                      </td>

                      {/* STAFF Column */}
                      <td className="py-3 px-2 text-xs">
                        {st ? (
                          <div>
                            <div className="font-bold text-slate-800 text-xs leading-snug truncate">
                              {st.name}
                            </div>
                            {b.assignedBy && b.assignedBy !== 'admin' && (
                              <div className="text-[10px] text-slate-400 mt-0.5 leading-snug truncate">
                                by {actorName(b.assignedBy)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-bold">—</span>
                        )}
                      </td>

                      {/* STATUS Column */}
                      <td className="py-3 pl-2 pr-4 text-right">
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
