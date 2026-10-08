import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { fmtTs } from '../../constants/data';

export function Enquiries({ onOpenEnquiry }) {
  const { inCity, enqAll, cityName, selectedCity, setSelectedCity, cities } = useStore();
  const [filter, setFilter] = useState('open');

  const all = inCity(enqAll(), (e) => e.city);

  const filterFn =
    {
      open: (e) => e.status === 'new' || e.status === 'contacted',
      new: (e) => e.status === 'new',
      converted: (e) => e.status === 'converted',
      closed: (e) => e.status === 'closed',
      all: () => true
    }[filter] || (() => true);

  const list = all.filter(filterFn);

  const countFor = (k) => {
    const fn =
      {
        open: (e) => e.status === 'new' || e.status === 'contacted',
        new: (e) => e.status === 'new',
        converted: (e) => e.status === 'converted',
        closed: (e) => e.status === 'closed',
        all: () => true
      }[k];
    return all.filter(fn).length;
  };

  return (
    <div className="p-4 sm:p-4 w-full space-y-3">
      {/* City Dropdown at Top matching Reference Screenshot */}
      <div className="flex items-center gap-2 self-start bg-white border border-slate-200/90 rounded-xl px-3 py-1 shadow-2xs w-fit">
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

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help requests</h1>
        <span className="text-xs text-slate-500 font-medium">{countFor('new')} new</span>
      </div>

      <p className="text-xs sm:text-[13px] text-slate-500 max-w-2xl leading-relaxed">
        Customers who tapped “Not sure what care you need?”. Call them, recommend the right service
        and turn the request into a booking.
      </p>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          ['open', 'Open'],
          ['new', 'New'],
          ['converted', 'Booked'],
          ['closed', 'Closed'],
          ['all', 'All']
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              filter === k
                ? 'bg-[#0E2F5A] text-white shadow-2xs'
                : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{l}</span>
            <span
              className={`text-[11px] font-bold ${
                filter === k ? 'text-white/80' : 'text-slate-400'
              }`}
            >
              {countFor(k)}
            </span>
          </button>
        ))}
      </div>

      {/* Grid of Request Cards */}
      {list.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200/90 space-y-1">
          <p className="font-bold text-slate-700 text-sm">No help requests here</p>
          <p className="text-xs">
            {filter === 'open'
              ? 'When families request clinical guidance from the app, their inquiry appears here.'
              : 'Try selecting a different filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpenEnquiry(e.id)}
              className="bg-white rounded-xl p-4.5 border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition text-left flex flex-col justify-between space-y-3 cursor-pointer group"
            >
              <div className="w-full space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-[#EBF2FA] text-[#0E2F5A] flex items-center justify-center shrink-0">
                      <Icon name="help" size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-[#0E2F5A] text-sm truncate">
                        {e.clientName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {e.code} · {cityName(e.city)} · {fmtTs(e.createdAt)}
                      </div>
                    </div>
                  </div>

                  <StatusBadge status={e.status} type="enquiry" />
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {e.patientType && (
                    <span className="px-2 py-0.5 rounded-md bg-[#EDF3FA] text-[#0E2F5A] text-[11px] font-medium">
                      {e.patientType}
                    </span>
                  )}
                  {e.patientAge && (
                    <span className="px-2 py-0.5 rounded-md bg-[#EDF3FA] text-[#0E2F5A] text-[11px] font-medium">
                      {e.patientAge} yrs
                    </span>
                  )}
                  {e.duration && (
                    <span className="px-2 py-0.5 rounded-md bg-[#EDF3FA] text-[#0E2F5A] text-[11px] font-medium">
                      {e.duration}
                    </span>
                  )}
                  {(e.files || []).length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#EDF3FA] text-[#0E2F5A] text-[11px] font-medium flex items-center gap-1">
                      <Icon name="image" size={11} />
                      {(e.files || []).length}
                    </span>
                  )}
                </div>

                {/* Description excerpt */}
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {e.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
