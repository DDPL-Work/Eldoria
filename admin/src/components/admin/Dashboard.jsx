import React from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import {
  fmtDate,
  todayISO,
  byDateTime,
  DEFAULT_CITIES,
  DOW,
  MON,
  ACTIVE
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
    assign,
    setStatus,
    notify
  } = useStore();

  const all = inCity(bookingsAll());
  const t = todayISO();
  const st = inCity(staffList(), (s) => s.city || DEFAULT_CITIES[0].id);

  const newReq = all.filter((b) => b.status === 'requested');
  const todayV = all.filter((b) => b.date === t && b.status !== 'cancelled');
  const unassigned = all.filter((b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId);
  const queue = all
    .filter((b) => ['requested', 'confirmed'].includes(b.status))
    .sort(byDateTime);

  const busyIds = new Set(
    all
      .filter((b) => ['on_the_way', 'in_progress'].includes(b.status))
      .map((b) => b.staffId)
  );

  const d = new Date();
  const hr = d.getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

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

  const handleAssign = (bookingId, staffId) => {
    if (staffId) {
      assign(bookingId, staffId, 'admin');
    }
  };

  // City breakdown data
  const cityRows = cities().map((c) => {
    const bs = bookingsAll().filter((b) => bCity(b) === c.id);
    const ss = staffList().filter((s) => (s.city || DEFAULT_CITIES[0].id) === c.id);
    return {
      c,
      req: bs.filter((b) => b.status === 'requested').length,
      open: bs.filter((b) => ACTIVE.includes(b.status)).length,
      today: bs.filter((b) => b.date === t && b.status !== 'cancelled').length,
      staff: ss.length,
      duty: ss.filter((s) => s.onDuty).length,
      un: bs.filter((b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId).length
    };
  });

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white shadow-lg border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="inline-block text-xs font-semibold text-teal-300 uppercase tracking-wider bg-teal-950/60 border border-teal-800/60 px-2.5 py-1 rounded-lg">
              {greet} · {DOW[d.getDay()]}, {d.getDate()} {MON[d.getMonth()]}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Care Desk {selectedCity !== 'all' && `· ${cityName(selectedCity)}`}
            </h1>
            <p className="text-sm text-amber-300 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              {newReq.length > 0
                ? `${newReq.length} new request${newReq.length > 1 ? 's' : ''} waiting for confirmation`
                : 'No new requests waiting'}
              {' · '}
              {unassigned.length > 0
                ? `${unassigned.length} booking${unassigned.length > 1 ? 's' : ''} need a caregiver`
                : 'All bookings staffed'}
            </p>
          </div>

          <button
            type="button"
            onClick={onNewBooking}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition duration-150 shrink-0 cursor-pointer"
          >
            <Icon name="plus" size={18} strokeWidth={2.5} />
            <span>New booking</span>
          </button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">New requests</span>
          <div className="text-3xl font-black text-amber-600 tabular-nums">{newReq.length}</div>
          <span className="text-xs text-slate-500">Awaiting confirmation</span>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Visits today</span>
          <div className="text-3xl font-black text-slate-900 tabular-nums">{todayV.length}</div>
          <span className="text-xs text-slate-500">
            {todayV.filter((b) => b.status === 'completed').length} done ·{' '}
            {todayV.filter((b) => b.status !== 'completed').length} open
          </span>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Staff on duty</span>
          <div className="text-3xl font-black text-slate-900 tabular-nums">
            {st.filter((s) => s.onDuty).length}
          </div>
          <span className="text-xs text-slate-500">of {st.length} total staff</span>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Unassigned</span>
          <div
            className={`text-3xl font-black tabular-nums ${
              unassigned.length ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {unassigned.length}
          </div>
          <span className="text-xs text-slate-500">Need a nurse or caregiver</span>
        </div>
      </div>

      {/* Action Triage Banners */}
      {helpRequests.length > 0 && (
        <button
          type="button"
          onClick={() => onTab('enquiries')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-50 border border-blue-200 hover:border-blue-300 text-left transition cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Icon name="help" size={20} />
            </div>
            <div className="truncate">
              <span className="font-bold text-blue-950 block text-sm sm:text-base">
                {helpRequests.length} new help request{helpRequests.length > 1 ? 's' : ''}: customers unsure what care they need
              </span>
              <span className="text-xs text-blue-800">
                {helpRequests.slice(0, 3).map((e) => `${e.clientName} (${e.patientType || 'care'})`).join(', ')}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 px-3.5 py-1.5 rounded-xl ml-3">
            Call &amp; recommend
          </span>
        </button>
      )}

      {pendingApps.length > 0 && (
        <button
          type="button"
          onClick={() => onTab('onboarding')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:border-amber-300 text-left transition cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Icon name="shield" size={20} />
            </div>
            <div className="truncate">
              <span className="font-bold text-amber-950 block text-sm sm:text-base">
                {pendingApps.length} staff application{pendingApps.length > 1 ? 's' : ''} waiting for review
              </span>
              <span className="text-xs text-amber-800">
                {pendingApps.slice(0, 3).map((x) => `${x.name} (${x.role})`).join(', ')}
                {pendingApps.length > 3 ? '…' : ''}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 px-3.5 py-1.5 rounded-xl ml-3">
            Review
          </span>
        </button>
      )}

      {/* Split Section: Needs Action vs Staff Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Needs Action */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-900 text-base">Needs action</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {queue.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onTab('bookings')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 transition cursor-pointer"
            >
              All bookings →
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <div className="font-bold text-slate-700">Nothing waiting</div>
              <p className="text-xs">New requests from the app, WhatsApp or calls appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">When</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.map((b) => {
                    const localStaff = st.filter(
                      (s) => (s.city || DEFAULT_CITIES[0].id) === bCity(b)
                    );
                    const otherStaff = st.filter(
                      (s) => (s.city || DEFAULT_CITIES[0].id) !== bCity(b)
                    );

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onOpenBooking(b.id)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-bold text-teal-700 group-hover:underline">
                              {b.clientName}
                            </div>
                            <div className="text-xs text-slate-400">
                              {b.patientName} · {b.code}
                            </div>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                          {cityName(bCity(b))}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 text-xs">
                            {svcB(b).name}
                          </div>
                          <div className="text-[11px] text-slate-400">{b.plan}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                          {fmtDate(b.date)}, {b.time}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={b.source} type="source" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {b.status === 'requested' ? (
                            <button
                              type="button"
                              onClick={() => handleConfirm(b)}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer"
                            >
                              Confirm
                            </button>
                          ) : (
                            <select
                              value={b.staffId || ''}
                              onChange={(e) => handleAssign(b.id, e.target.value)}
                              aria-label={`Assign staff for ${b.code}`}
                              className="rounded-xl border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                            >
                              <option value="">
                                {st.length
                                  ? localStaff.length
                                    ? 'Assign staff…'
                                    : `No staff in ${cityName(bCity(b))}`
                                  : 'Add staff first'}
                              </option>
                              {localStaff.length > 0 && (
                                <optgroup label={`In ${cityName(bCity(b))}`}>
                                  {localStaff.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} · {s.role}
                                      {s.onDuty ? '' : ' (off duty)'}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {otherStaff.length > 0 && (
                                <optgroup label="Other cities">
                                  {otherStaff.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} · {s.role} (
                                      {cityName(s.city || DEFAULT_CITIES[0].id)})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right (1 Col): Staff Availability */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-black text-slate-900 text-base">Staff availability</h2>
            <button
              type="button"
              onClick={() => onTab('staff')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 transition cursor-pointer"
            >
              Manage →
            </button>
          </div>

          <div className="p-3 divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {st.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <p className="font-bold text-slate-700 text-sm">No staff added yet</p>
                <button
                  type="button"
                  onClick={() => onTab('staff')}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  Add staff
                </button>
              </div>
            ) : (
              st.map((s) => {
                const isBusy = busyIds.has(s.id);
                const state = isBusy
                  ? { label: 'On visit', color: 'text-amber-600 bg-amber-50 border-amber-200' }
                  : s.onDuty
                  ? { label: 'Available', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
                  : { label: 'Off duty', color: 'text-slate-500 bg-slate-100 border-slate-200' };

                const initials = s.name
                  ? s.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'S';

                return (
                  <div key={s.id} className="py-2.5 px-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">{s.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {s.role} · {cityName(s.city || DEFAULT_CITIES[0].id)}
                          {s.area ? `, ${s.area}` : ''}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${state.color}`}
                    >
                      {state.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* By City Breakdown (Shown when selectedCity is 'all') */}
      {selectedCity === 'all' && (
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-base">By city</h2>
              <p className="text-xs text-slate-500">Summary across all operational hubs</p>
            </div>
            <button
              type="button"
              onClick={() => onTab('cities')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 transition cursor-pointer"
            >
              Manage cities →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">New requests</th>
                  <th className="py-3 px-4">Open bookings</th>
                  <th className="py-3 px-4">Visits today</th>
                  <th className="py-3 px-4">Unassigned</th>
                  <th className="py-3 px-4">Staff on duty</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cityRows.map((r) => (
                  <tr key={r.c.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.c.name}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{r.req}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{r.open}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{r.today}</td>
                    <td
                      className={`py-3 px-4 font-mono font-bold ${
                        r.un ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {r.un}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {r.duty} of {r.staff}
                      {!r.staff && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          No staff
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCity(r.c.id)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Filter
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
