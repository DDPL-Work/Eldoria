import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { useFiles } from '../../context/FileContext';
import { OB_DOCS, fmtTs, DEFAULT_CITIES } from '../../constants/data';

export function Onboarding({ onOpenApplication }) {
  const { inCity, applications, apprOf, cityName, sCity, cities, selectedCity, setSelectedCity } = useStore();
  const { fileGet } = useFiles();
  const [filter, setFilter] = useState('pending');

  const all = inCity(applications(), sCity);

  const countFor = (k) =>
    k === 'all' ? all.length : all.filter((x) => apprOf(x) === k).length;

  const list = filter === 'all' ? all : all.filter((x) => apprOf(x) === filter);

  return (
    <div className="p-4 sm:p-5 lg:p-4 w-full max-w-[1400px] mx-auto space-y-3">
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff onboarding</h1>
        <span className="text-xs text-slate-500 font-medium">
          {countFor('pending')} waiting for review
        </span>
      </div>

      {/* 3. Description Subtitle */}
      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
        Nurses and caregivers apply from the Staff app with their details and documents. Check each
        document, then approve them to join the platform. Only approved staff can sign in and be
        assigned visits.
      </p>

      {/* 4. Filter Chips Row with Aligned Button Labels */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
            className={`h-10 px-3.5 rounded-xl text-xs sm:text-[13px] whitespace-nowrap transition cursor-pointer select-none flex items-center justify-center gap-1.5 leading-none ${
              filter === k
                ? 'border-2 border-[#0A2342] bg-[#EAF2FA] text-[#0A2342] font-bold shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50'
            }`}
          >
            <span>{l}</span>
            <span className={filter === k ? 'text-[#0A2342] font-bold' : 'text-slate-500 font-semibold'}>
              {countFor(k)}
            </span>
          </button>
        ))}
      </div>

      {/* 5. Grid of Applicants with Compact Gap and Proper Width */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                className="bg-white rounded-lg p-4 border border-slate-200/90  hover:border-[#0A2342] hover:shadow-md transition text-left flex flex-col justify-between space-y-2.5 cursor-pointer group"
              >
                {/* Top Row: Avatar + Name / Role / City + Status Badge */}
                <div className="flex items-start justify-between gap-2.5 w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-[52px] h-[52px] rounded-full overflow-hidden bg-[#EBF2FA] shrink-0 border border-slate-100 flex items-center justify-center">
                      {photoFile?.data ? (
                        <img
                          src={photoFile.data}
                          alt={a.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-extrabold text-[#0A2342] text-sm">{initials}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-[#0A2342] text-sm truncate leading-tight">
                        {a.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate mt-1 leading-tight">
                        {a.role} · {a.experience || 0} yrs · {cityName(sCity(a))}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 ${
                      apprOf(a) === 'pending'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : apprOf(a) === 'approved'
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : apprOf(a) === 'changes'
                        ? 'bg-[#E0F2FE] text-[#075985]'
                        : 'bg-[#FEE2E2] text-[#991B1B]'
                    }`}
                  >
                    {apprOf(a) === 'pending'
                      ? 'Under review'
                      : apprOf(a) === 'approved'
                      ? 'Approved'
                      : apprOf(a) === 'changes'
                      ? 'Changes requested'
                      : 'Not approved'}
                  </span>
                </div>

                {/* Middle Row: Document verified stats + timestamp */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <Icon name="list" size={13} className="text-slate-500" />
                    <span>
                      {uploadedCount} document{uploadedCount === 1 ? '' : 's'} · {verifiedReq}/{req.length} verified
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{fmtTs(a.submittedAt)}</span>
                </div>

                {/* Bottom Row: Key skills */}
                <div className="text-[11px] text-slate-400 truncate">
                  {(a.skillList || []).slice(0, 4).join(' · ')}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
