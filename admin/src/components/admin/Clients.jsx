import React from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { fmtDate, telHref, waHref, byDateTime, ACTIVE } from '../../constants/data';

export function Clients() {
  const {
    inCity,
    bookingsAll,
    cityName,
    bCity,
    cities,
    selectedCity,
    setSelectedCity
  } = useStore();

  const m = {};
  inCity(bookingsAll(), bCity).forEach((b) => {
    const k = b.clientPhone;
    if (!m[k]) {
      m[k] = {
        name: b.clientName,
        phone: k,
        patients: new Set(),
        cities: new Set(),
        list: []
      };
    }
    m[k].list.push(b);
    if (b.patientName) m[k].patients.add(b.patientName);
    m[k].cities.add(bCity(b));
  });

  const rows = Object.values(m);

  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-3">
      {/* 1. City Dropdown Pill at Top */}
      <div className="flex items-center gap-2 self-start bg-white border border-slate-200/90 rounded-lg px-3 py-1 shadow-2xs w-fit">
        <Icon name="pin" size={15} className="text-slate-500" />
        <span className="text-xs font-semibold text-slate-500">City</span>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer py-1 pr-1"
        >
          <option value="all">All cities</option>
          {cities().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Header Row: Title on Left, Count on Right */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clients</h1>
        <span className="text-xs text-slate-500 font-medium">
          {rows.length} {rows.length === 1 ? 'family' : 'families'}
        </span>
      </div>

      {/* 3. Clients Table Card */}
      <section className="bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 text-sm">No clients yet</p>
            <p className="text-xs">Families appear here after their first booking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4 whitespace-nowrap">Client</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">City</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Mobile</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Patients</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Bookings</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Last visit</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const sorted = r.list.slice().sort(byDateTime);
                  const last = sorted[sorted.length - 1];
                  const activeCount = r.list.filter((b) => ACTIVE.includes(b.status)).length;

                  return (
                    <tr key={r.phone} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {r.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {[...r.cities].map(cityName).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        +91 {r.phone}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {[...r.patients].join(', ')}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-900">{r.list.length}</span>
                        {activeCount > 0 ? (
                          <span className="ml-1 text-slate-500 font-semibold">
                            ({activeCount} active)
                          </span>
                        ) : (
                          <span className="ml-1 text-slate-400 font-medium">
                            (0 active)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {last ? fmtDate(last.date) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={telHref(r.phone)}
                            className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs leading-none whitespace-nowrap select-none"
                            aria-label={`Call ${r.name}`}
                          >
                            <Icon name="phone" size={14} className="text-slate-600" />
                            <span>Call</span>
                          </a>
                          <a
                            href={waHref(
                              r.phone,
                              `Hello ${r.name}, this is the Eldoria Care at Home team.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-[#128C4A] hover:bg-[#0e703b] text-white text-xs font-bold transition shadow-2xs leading-none whitespace-nowrap select-none"
                            aria-label={`WhatsApp ${r.name}`}
                          >
                            <Icon name="wa" size={14} className="text-white" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
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
