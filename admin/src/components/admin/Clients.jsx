import React from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { fmtDate, telHref, waHref, byDateTime, ACTIVE } from '../../constants/data';

export function Clients() {
  const { inCity, bookingsAll, cityName, bCity } = useStore();

  const m = {};
  inCity(bookingsAll()).forEach((b) => {
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
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clients</h1>
        <p className="text-xs text-slate-500 font-medium">
          {rows.length} families receiving home care services
        </p>
      </div>

      {/* Clients Table Card */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 text-sm">No clients yet</p>
            <p className="text-xs">Families appear here once their first booking is registered.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Client family</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Mobile</th>
                  <th className="py-3.5 px-4">Patients</th>
                  <th className="py-3.5 px-4">Bookings</th>
                  <th className="py-3.5 px-4">Last visit</th>
                  <th className="py-3.5 px-4 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const sorted = r.list.slice().sort(byDateTime);
                  const last = sorted[sorted.length - 1];
                  const activeCount = r.list.filter((b) => ACTIVE.includes(b.status)).length;

                  return (
                    <tr key={r.phone} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.name}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {[...r.cities].map(cityName).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        +91 {r.phone}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {[...r.patients].join(', ')}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <span className="font-bold text-slate-900">{r.list.length}</span>
                        {activeCount > 0 && (
                          <span className="ml-1 text-teal-700 font-semibold">
                            ({activeCount} active)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                        {last ? fmtDate(last.date) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={telHref(r.phone)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                          >
                            <Icon name="phone" size={14} />
                            <span>Call</span>
                          </a>
                          <a
                            href={waHref(r.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
                          >
                            <Icon name="wa" size={14} />
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
