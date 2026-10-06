import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { useFiles } from '../../context/FileContext';
import { OB_DOCS, fmtTs } from '../../constants/data';

export function Onboarding({ onOpenApplication }) {
  const { inCity, applications, apprOf, cityName, sCity } = useStore();
  const { fileGet } = useFiles();
  const [filter, setFilter] = useState('pending');

  const all = inCity(applications(), sCity);

  const countFor = (k) =>
    k === 'all' ? all.length : all.filter((x) => apprOf(x) === k).length;

  const list = filter === 'all' ? all : all.filter((x) => apprOf(x) === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff onboarding</h1>
          <p className="text-xs text-slate-500 font-medium">
            {countFor('pending')} applicants waiting for verification &amp; activation
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
        Nurses and caregivers apply with their credentials and verification documents. Check each
        mandatory document, then approve them to join the active platform. Only approved staff can
        sign in and be assigned home care visits.
      </p>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          ['pending', 'Under review'],
          ['changes', 'Changes requested'],
          ['approved', 'Approved'],
          ['rejected', 'Not approved'],
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

      {/* Grid of Applicants */}
      {list.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200/80 space-y-1">
          <p className="font-bold text-slate-700 text-sm">
            {filter === 'pending' ? 'No applications waiting' : 'No applications found'}
          </p>
          <p className="text-xs">
            {filter === 'pending'
              ? 'When a nurse or caregiver applies via the Staff mobile app, their profile appears here.'
              : 'Try selecting a different filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((a) => {
            const req = OB_DOCS.filter((x) => x.req);
            const verifiedReq = req.filter((x) => (a.docChecks || {})[x.k]).length;
            const uploadedCount = OB_DOCS.filter((x) => (a.files || {})[x.k]).length;
            const photoFile = a.files?.photo ? fileGet(a.files.photo.id) : null;

            const initials = a.name
              ? a.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'A';

            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onOpenApplication(a.id)}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition text-left flex flex-col justify-between space-y-4 cursor-pointer group"
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {photoFile?.data ? (
                      <img
                        src={photoFile.data}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <div className="min-w-0 grow">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-slate-900 group-hover:text-teal-700 text-sm truncate">
                        {a.name}
                      </span>
                      <StatusBadge status={apprOf(a)} type="onboarding" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {a.role} · {a.experience || 0} yrs · {cityName(sCity(a))}
                    </p>
                  </div>
                </div>

                <div className="w-full space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Icon name="list" size={13} />
                      {uploadedCount} docs · {verifiedReq}/{req.length} verified
                    </span>
                    <span className="font-mono">{fmtTs(a.submittedAt)}</span>
                  </div>

                  {a.skillList && a.skillList.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden truncate text-[11px] text-slate-400">
                      {a.skillList.slice(0, 3).join(' · ')}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
