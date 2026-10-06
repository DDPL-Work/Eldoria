import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { fmtTs } from '../../constants/data';

export function Enquiries({ onOpenEnquiry }) {
  const { inCity, enqAll, cityName } = useStore();
  const [filter, setFilter] = useState('open');

  const all = inCity(enqAll(), (e) => e.city);

  const filterFn = {
    open: (e) => e.status === 'new' || e.status === 'contacted',
    new: (e) => e.status === 'new',
    converted: (e) => e.status === 'converted',
    closed: (e) => e.status === 'closed',
    all: () => true
  }[filter] || (() => true);

  const list = all.filter(filterFn);

  const countFor = (k) => {
    const fn = {
      open: (e) => e.status === 'new' || e.status === 'contacted',
      new: (e) => e.status === 'new',
      converted: (e) => e.status === 'converted',
      closed: (e) => e.status === 'closed',
      all: () => true
    }[k];
    return all.filter(fn).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Help requests</h1>
        <p className="text-xs text-slate-500 font-medium">
          {countFor('new')} new requests awaiting consultation
        </p>
      </div>

      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
        Customers who tapped “Not sure what care you need?” in the app. Call them, understand patient
        needs, recommend the appropriate service and convert into a confirmed booking.
      </p>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              filter === k
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{l}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === k ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {countFor(k)}
            </span>
          </button>
        ))}
      </div>

      {/* Grid of Request Cards */}
      {list.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 space-y-1">
          <p className="font-bold text-slate-700 text-sm">No help requests here</p>
          <p className="text-xs">
            {filter === 'open'
              ? 'When families request clinical guidance from the app, their inquiry appears here.'
              : 'Try selecting a different filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpenEnquiry(e.id)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition text-left flex flex-col justify-between space-y-4 cursor-pointer group"
            >
              <div className="w-full space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                      <Icon name="help" size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-teal-700 text-sm truncate">
                        {e.clientName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {e.code} · {cityName(e.city)}
                      </div>
                    </div>
                  </div>

                  <StatusBadge status={e.status} type="enquiry" />
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {e.patientType && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {e.patientType}
                    </span>
                  )}
                  {e.patientAge && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {e.patientAge} yrs
                    </span>
                  )}
                  {e.duration && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {e.duration}
                    </span>
                  )}
                  {(e.files || []).length > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold flex items-center gap-1 border border-teal-200">
                      <Icon name="image" size={11} />
                      {(e.files || []).length}
                    </span>
                  )}
                </div>

                {/* Description excerpt */}
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed pt-1">
                  {e.description}
                </p>
              </div>

              <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Received</span>
                <span>{fmtTs(e.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
