import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import {
  fmtDate,
  todayISO,
  byDateTime,
  DEFAULT_CITIES,
  DOW,
  MON
} from '../../constants/data';

export function Dashboard({ onTab, onOpenBooking, onNewBooking }) {
  const {
    selectedCity,
    setSelectedCity,
    inCity,
    bookingsAll,
    staffList,
    enqAll,
    applications,
    apprOf,
    cities,
    cityName,
    bCity,
    svcB,
    setStatus,
    assign,
    unassign,
    notify
  } = useStore();

  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setCityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const all = inCity(bookingsAll());
  const t = todayISO();
  const st = inCity(staffList(), (s) => s.city || DEFAULT_CITIES[0].id);


  // Cities for "By city" section
  const targetCityIds = ['mumbai', 'thane', 'navi-mumbai'];
  const byCityRows = targetCityIds.map((cid) => {
    const cName = cityName(cid);
    const cBookings = bookingsAll().filter((b) => bCity(b) === cid);
    const cNewReq = cBookings.filter((b) => b.status === 'requested').length;
    const cOpen = cBookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
    const cVisitsToday = cBookings.filter((b) => b.date === t && b.status !== 'cancelled').length;
    const cUnassigned = cBookings.filter((b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId).length;
    const cStaff = staffList().filter((s) => (s.city || 'mumbai') === cid);
    const cStaffOnDuty = cStaff.filter((s) => s.onDuty).length;
    const cStaffTotal = cStaff.length;

    return {
      id: cid,
      name: cName,
      newReq: cNewReq,
      openBookings: cOpen,
      visitsToday: cVisitsToday,
      unassigned: cUnassigned,
      staffOnDuty: cStaffOnDuty,
      staffTotal: cStaffTotal
    };
  });

  const newReq = all.filter((b) => b.status === 'requested');
  const todayV = all.filter((b) => b.date === t && b.status !== 'cancelled');
  const unassigned = all.filter(
    (b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId
  );
  const queue = all
    .filter((b) => ['requested', 'confirmed'].includes(b.status))
    .sort(byDateTime);

  // Help requests & pending applications
  const helpRequests = inCity(enqAll(), (e) => e.city).filter((e) => e.status === 'new');
  const pendingApps = inCity(applications()).filter((x) => apprOf(x) === 'pending');

  const handleConfirm = (b) => {
    setStatus(b, 'confirmed', { confirmedBy: 'admin', confirmedAt: Date.now() }, 'admin');
    notify(
      'client:' + b.clientPhone,
      'Booking confirmed',
      `Your ${svcB(b).name} booking ${b.code} is confirmed for ${fmtDate(b.date)}, ${b.time}. We'll assign a caregiver next.`,
      b.id
    );
  };

  // Date and greeting
  const d = new Date();
  const hr = d.getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const dayName = DOW[d.getDay()];
  const monthName = MON[d.getMonth()];
  const dateNum = d.getDate();
  const year = d.getFullYear();

  // Source badge styling
  const renderSourceBadge = (source) => {
    const s = String(source || 'App').toLowerCase();
    if (s.includes('wa') || s.includes('whatsapp')) {
      return (
        <span className="bg-[#e6f7ec] text-[#13803f] text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block">
          WhatsApp
        </span>
      );
    }
    if (s.includes('call') || s.includes('phone')) {
      return (
        <span className="bg-[#f0f2f5] text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block">
          Call
        </span>
      );
    }
    return (
      <span className="bg-[#e0effa] text-[#1a649f] text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block">
        App
      </span>
    );
  };

  // Staff avatar initials
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // KPI counts computed directly without falsy fallbacks
  const countNewReq = newReq.length;
  const countTodayVisits = todayV.length;
  const countTodayCompleted = todayV.filter((b) => b.status === 'completed').length;
  const countTodayOpen = Math.max(0, countTodayVisits - countTodayCompleted);
  const countStaffOnDuty = st.filter((s) => s.onDuty).length;
  const countStaffTotal = st.length;
  const countUnassigned = unassigned.length;

  return (
    <div className="p-4 sm:p-6 lg:p-4 max-w-[1440px] mx-auto space-y-4 sm:space-y-4">
      {/* 4. DASHBOARD HEADER - Styled City Selector */}
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

          {/* Dropdown Menu */}
          {cityDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-2xl border border-slate-200 py-1 z-40 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedCity('all');
                  setCityDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition flex items-center justify-between ${
                  selectedCity === 'all'
                    ? 'bg-[#1864AB] text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>All cities</span>
              </button>
              {cities().map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCity(c.id);
                    setCityDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition flex items-center justify-between ${
                    selectedCity === c.id
                      ? 'bg-[#1864AB] text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. CARE DESK HERO BANNER with Official Logo */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0C2B54] via-[#0E3A73] to-[#124991] p-5 sm:p-6 text-white shadow-sm border border-[#164b85]/40 select-none">
        {/* Subtle yellow decorative chevron peaks at bottom of banner */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/4 pointer-events-none opacity-40">
          <svg width="240" height="24" viewBox="0 0 240 24" fill="none">
            <path d="M20 24 L40 6 L60 24 M70 24 L90 6 L110 24 M120 24 L140 6 L160 24" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          {/* Left: Official Circular Logo + Greeting Info */}
          <div className="flex items-center gap-3.5 sm:gap-4.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white shadow-md flex items-center justify-center p-0.5 shrink-0 select-none overflow-hidden">
              <img
                src="/eldoria-logo.png"
                alt="Eldoria+ Care at Home"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <p className="text-slate-300 text-xs sm:text-[13px] font-medium leading-none">
                {greet} · {dayName}, {dateNum} {monthName} {year}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mt-1.5">
                Care desk{selectedCity !== 'all' ? ` · ${cityName(selectedCity)}` : ''}
              </h1>
              <p className="text-[#f59e0b] font-bold text-xs sm:text-sm mt-1 leading-snug">
                {countNewReq} new request{countNewReq === 1 ? '' : 's'} waiting for confirmation
              </p>
            </div>
          </div>

          {/* Right: + New booking Button */}
          <button
            type="button"
            onClick={onNewBooking}
            className="bg-[#f59e0b] hover:bg-[#e69107] text-[#0c1f36] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition shrink-0 cursor-pointer"
          >
            <span className="text-lg leading-none font-extrabold">+</span>
            <span>New booking</span>
          </button>
        </div>
      </section>

      {/* 6. KPI CARDS - All with Identical Width, Height & Compact rounded-xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: New requests */}
        <div className="w-full bg-white rounded-xl border border-slate-200/90 border-t-[3px] border-t-[#F59E0B] p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[118px]">
          <span className="text-xs font-semibold text-slate-500 block">New requests</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#D97706] tabular-nums my-1 leading-none">
            {countNewReq}
          </div>
          <span className="text-xs text-slate-400 block">Awaiting confirmation</span>
        </div>

        {/* KPI 2: Visits today */}
        <div className="w-full bg-white rounded-xl border border-slate-200/90 border-t-[3px] border-t-[#0284C7] p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[118px]">
          <span className="text-xs font-semibold text-slate-500 block">Visits today</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums my-1 leading-none">
            {countTodayVisits}
          </div>
          <span className="text-xs text-slate-400 block">
            {countTodayCompleted} completed · {countTodayOpen} open
          </span>
        </div>

        {/* KPI 3: Staff on duty */}
        <div className="w-full bg-white rounded-xl border border-slate-200/90 border-t-[3px] border-t-[#F59E0B] p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[118px]">
          <span className="text-xs font-semibold text-slate-500 block">Staff on duty</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums my-1 leading-none">
            {countStaffOnDuty}
          </div>
          <span className="text-xs text-slate-400 block">of {countStaffTotal} staff</span>
        </div>

        {/* KPI 4: Unassigned */}
        <div className="w-full bg-white rounded-xl border border-slate-200/90 border-t-[3px] border-t-[#F59E0B] p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[118px]">
          <span className="text-xs font-semibold text-slate-500 block">Unassigned</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#DC2626] tabular-nums my-1 leading-none">
            {countUnassigned}
          </div>
          <span className="text-xs text-slate-400 block">Need a nurse or caregiver</span>
        </div>
      </div>

      {/* 7. HELP REQUEST ALERT (Displayed conditionally) */}
      {helpRequests.length > 0 && (
        <div className="w-full bg-[#edf4fb] border border-[#d2e2f2] rounded-xl px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 sm:gap-4 shadow-2xs">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-full bg-[#0d2238] text-white flex items-center justify-center shrink-0">
              <Icon name="help" size={18} strokeWidth={2.4} />
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block text-xs sm:text-sm truncate">
                {helpRequests.length} new help request: customers not sure what care they need
              </span>
              <span className="text-xs text-slate-500 truncate block mt-0.5">
                {helpRequests.slice(0, 2).map((e) => `${e.clientName} (${e.patientType || 'Elderly care'})`).join(', ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTab('enquiries')}
            className="shrink-0 bg-[#0E2F5A] hover:bg-[#163D70] active:scale-[0.98] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
          >
            Call &amp; recommend
          </button>
        </div>
      )}

      {/* 8. STAFF APPLICATION ALERT (Displayed conditionally) */}
      {pendingApps.length > 0 && (
        <div className="w-full bg-[#fef7eb] border border-[#fde4ba] rounded-xl px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 sm:gap-4 shadow-2xs">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#f59e0b] text-[#0d2238] flex items-center justify-center shrink-0 font-bold">
              <Icon name="shield" size={18} strokeWidth={2.4} />
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block text-xs sm:text-sm truncate">
                {pendingApps.length} staff application waiting for review
              </span>
              <span className="text-xs text-slate-500 truncate block mt-0.5">
                {pendingApps.map((x) => `${x.name} (${x.role})`).join(', ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTab('onboarding')}
            className="shrink-0 bg-[#0E2F5A] hover:bg-[#163D70] active:scale-[0.98] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
          >
            Review
          </button>
        </div>
      )}

      {/* 9 & 10. SPLIT SECTION: NEEDS ACTION VS STAFF AVAILABILITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 9. NEEDS ACTION SECTION (Left ~65% / 8 cols) */}
        <section className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">Needs action</h2>
            <button
              type="button"
              onClick={() => onTab('bookings')}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              All bookings
            </button>
          </div>

          {/* Table with overflow container & whitespace-nowrap columns */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
              <thead>
                <tr className="bg-[#f1f5f9] text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">CLIENT</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">CITY</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">SERVICE</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">WHEN</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">SOURCE</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold text-right whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.length === 0 ? (
                  <tr className="text-center py-8">
                    <td colSpan={6} className="py-8 text-slate-400 text-xs">
                      No bookings currently need action
                    </td>
                  </tr>
                ) : (
                  queue.slice(0, 8).map((b) => {
                    const isToday = b.date === t;
                    const whenFormatted = isToday ? `Today, ${b.time}` : `${fmtDate(b.date)}, ${b.time}`;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition">
                        {/* CLIENT Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenBooking(b.id)}
                            className="text-left group cursor-pointer block"
                          >
                            <div className="font-bold text-slate-900 text-xs sm:text-[13px] group-hover:text-teal-700 whitespace-nowrap leading-snug">
                              {b.clientName}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap leading-snug">
                              {b.patientName} · {b.code}
                            </div>
                          </button>
                        </td>

                        {/* CITY Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 text-slate-700 text-xs font-medium whitespace-nowrap">
                          {cityName(bCity(b))}
                        </td>

                        {/* SERVICE Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-800 text-xs sm:text-[13px] whitespace-nowrap leading-snug">
                            {svcB(b).name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap leading-snug">
                            {b.plan || 'Single visit'}
                          </div>
                        </td>

                        {/* WHEN Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 text-xs text-slate-700 font-medium whitespace-nowrap">
                          {whenFormatted}
                        </td>

                        {/* SOURCE Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                          {renderSourceBadge(b.source)}
                        </td>

                        {/* ACTION Column with Navy Confirm Button & Native Floating Assign Select */}
                        <td className="py-2.5 px-3.5 sm:px-4 text-right whitespace-nowrap">
                          {b.status === 'requested' ? (
                            <button
                              type="button"
                              onClick={() => handleConfirm(b)}
                              className="bg-[#0E2F5A] hover:bg-[#163D70] active:scale-[0.98] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs inline-block"
                            >
                              Confirm
                            </button>
                          ) : (() => {
                            const stList = staffList();
                            const bc = bCity(b);
                            const defaultCityId = DEFAULT_CITIES[0]?.id || 'mumbai';
                            const local = stList.filter((s) => (s.city || defaultCityId) === bc);
                            const other = stList.filter((s) => (s.city || defaultCityId) !== bc);
                            return (
                              <select
                                aria-label={`Assign staff for ${b.code}`}
                                value={b.staffId || ''}
                                onChange={(e) => {
                                  const sid = e.target.value;
                                  if (sid) {
                                    assign(b.id, sid, 'admin');
                                  } else {
                                    unassign(b.id);
                                  }
                                }}
                                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-[13px] font-medium px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] transition max-w-[200px]"
                              >
                                <option value="">
                                  {stList.length ? (local.length ? 'Assign staff..' : `No staff in ${cityName(bc)}`) : 'Add staff first'}
                                </option>
                                {local.length > 0 && (
                                  <optgroup label={`In ${cityName(bc)}`}>
                                    {local.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} · {s.role}{!s.onDuty ? ' (off duty)' : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {other.length > 0 && (
                                  <optgroup label="Other cities">
                                    {other.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} · {s.role}{!s.onDuty ? ' (off duty)' : ''} · {cityName(s.city || defaultCityId)}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. STAFF AVAILABILITY SECTION (Right ~35% / 4 cols) */}
        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">Staff availability</h2>
            <button
              type="button"
              onClick={() => onTab('staff')}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Manage
            </button>
          </div>

          {/* Staff Rows */}
          <div className="divide-y divide-slate-100 overflow-y-auto">
            {st.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No staff found</div>
            ) : (
              st.slice(0, 7).map((s) => (
                <div
                  key={s.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Circle Initials Avatar matching Peach tone */}
                    <div className="w-8 h-8 rounded-full bg-[#fed7aa] text-[#9a3412] font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(s.name)}
                    </div>
                    {/* Staff Details */}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-[13px] truncate leading-snug">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 leading-snug">
                        {s.role} · {cityName(s.city || 'mumbai')}
                        {s.area ? `, ${s.area}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 text-right">
                    {s.onDuty ? (
                      <span className="text-[#15803d] font-bold text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />
                        Available
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Off duty
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 11. BY CITY SECTION (Shown when "All cities" is selected) */}
      {selectedCity === 'all' && (
        <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">By city</h2>
            <button
              type="button"
              onClick={() => onTab('cities')}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Manage cities
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#f1f5f9] text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4.5 font-bold whitespace-nowrap">CITY</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">NEW REQUESTS</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">OPEN BOOKINGS</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">VISITS TODAY</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">UNASSIGNED</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">STAFF ON DUTY</th>
                  <th className="py-2.5 px-4.5 font-bold text-right whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byCityRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4.5 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {row.newReq}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {row.openBookings}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {row.visitsToday}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {row.unassigned > 0 ? (
                        <span className="text-[#dc2626] font-bold text-xs sm:text-sm">{row.unassigned}</span>
                      ) : (
                        <span className="text-slate-800 text-xs sm:text-sm font-semibold">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                      {row.staffTotal === 0 ? (
                        <span className="text-slate-500 font-medium inline-flex items-center gap-1.5">
                          0 of 0
                          <span className="bg-[#fef3c7] text-[#92400e] text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
                            No staff
                          </span>
                        </span>
                      ) : (
                        <span className="font-medium text-slate-800">
                          {row.staffOnDuty} of {row.staffTotal}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCity(row.id)}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1 rounded-lg transition cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
