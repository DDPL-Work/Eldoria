import React, { useState, useEffect } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { telHref, waHref } from '../../constants/data';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { CityDropdown } from '../common/CityDropdown';
import { Pagination } from '../common/Pagination';

function formatClientDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

export function Clients({ onOpenClient }) {
  const {
    cityName,
    cities,
    selectedCity,
    setSelectedCity,
    backendClients,
    clientsPagination,
    fetchClients,
    dataLoading,
    dataError
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Reset to page 1 whenever search query or city filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, searchQuery]);

  // Call getClients API on mount and whenever parameters change
  useEffect(() => {
    const params = {
      page: currentPage,
      limit: pageSize
    };
    if (selectedCity && selectedCity !== 'all') {
      params.city = selectedCity;
    }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }
    fetchClients(params);
  }, [fetchClients, selectedCity, searchQuery, currentPage, pageSize]);

  // Normalize backend clients list
  const rows = (backendClients || []).map((c) => {
    const u = c.user || {};
    return {
      id: c.id || c.clientId,
      clientId: c.clientId || (c.id ? `CLT-${c.id}` : '—'),
      name: u.name || c.patientName || 'Client',
      email: u.email || '',
      phone: u.phone || c.emergencyPhone || '',
      city: c.city || '',
      area: c.area || '',
      address: c.address || '',
      patientName: c.patientName || '—',
      patientAge: c.patientAge ? `${c.patientAge} yrs` : '',
      patientGender: c.patientGender || '',
      relation: c.relation || '',
      requiredService: c.requiredService || 'General Care',
      status: c.status || 'active',
      createdAt: c.createdAt || c.submittedAt || c.created_at,
      raw: c
    };
  });

  const handleRefresh = () => {
    const params = {
      page: currentPage,
      limit: pageSize
    };
    if (selectedCity && selectedCity !== 'all') {
      params.city = selectedCity;
    }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }
    fetchClients(params);
  };

  // Total count, total pages, and pagination helpers
  const totalCount =
    clientsPagination?.total !== undefined
      ? clientsPagination.total
      : Array.isArray(backendClients)
      ? backendClients.length
      : 0;

  const totalPages =
    clientsPagination?.totalPages !== undefined && clientsPagination.totalPages > 0
      ? clientsPagination.totalPages
      : Math.max(1, Math.ceil(totalCount / pageSize));

  // Safe clamped current page
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // If backend returned paginated data, we render rows directly.
  // If backend returned unpaginated list, slice client-side.
  const isServerPaginated =
    clientsPagination && clientsPagination.totalPages !== undefined;
  const displayRows = isServerPaginated
    ? rows
    : rows.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);



  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-4">
      {/* 1. Page Header: Title, Count & Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clients</h1>
            <span className="text-xs text-slate-500 font-medium">
              {totalCount} {totalCount === 1 ? 'client' : 'clients'}
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed mt-0.5">
            Registered clients and families requesting home care services across operational cities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={dataLoading}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer shadow-2xs disabled:opacity-60 shrink-0 self-start sm:self-auto select-none"
          title="Refresh clients from server"
        >
          <RiRefreshLine className={`text-base ${dataLoading ? 'animate-spin text-[#0E2F5A]' : ''}`} />
          <span>{dataLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* 2. Filter & Search Controls Bar */}
      <div className="bg-white rounded-lg p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* City Dropdown Pill matching Booking & Dashboard */}
          <CityDropdown className="shrink-0" />

          {/* Search Input Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, mobile, city, area..."
              className="w-full bg-white border border-slate-200/90 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {dataLoading && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-lg shrink-0">
            <RiRefreshLine className="animate-spin text-sm" />
            <span>Syncing from database...</span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {dataError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center justify-between gap-2">
          <span>Failed to fetch clients: {String(dataError)}</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="underline font-bold hover:text-red-900 cursor-pointer flex items-center gap-1"
          >
            <RiRefreshLine className="text-sm" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 3. Clients Table Card */}
      <section className="bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden">
        {dataLoading ? (
          <DatabaseLoader
            title="Fetching Clients from Database..."
            subtitle="Connecting to Eldoria backend server"
          />
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <p className="font-bold text-slate-700 text-sm">
              {searchQuery ? 'No matching clients found' : 'No clients found'}
            </p>
            <p className="text-xs">
              {searchQuery
                ? 'Try a different search keyword or clear filters.'
                : 'Clients registered via the Client app will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4 whitespace-nowrap">Client</th>
                  <th className="py-3 px-4 whitespace-nowrap">City / Area</th>
                  <th className="py-3 px-4 whitespace-nowrap">Mobile</th>
                  <th className="py-3 px-4 whitespace-nowrap">Patient / Care Receiver</th>
                  <th className="py-3 px-4 whitespace-nowrap">Required Service</th>
                  <th className="py-3 px-4 whitespace-nowrap">Registered</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((r) => (
                  <tr
                    key={r.id || r.phone}
                    onClick={() => onOpenClient && onOpenClient(r.clientId || r.id)}
                    className="hover:bg-slate-50/60 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 group-hover:text-[#0E2F5A] leading-tight transition-colors">
                        {r.name}
                      </div>
                      {r.email && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {r.email}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {r.clientId}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      <div>{cityName(r.city) || r.city || '—'}</div>
                      {r.area && (
                        <div className="text-[11px] text-slate-400 font-normal truncate max-w-[150px]">
                          {r.area}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {r.phone ? `+91 ${r.phone}` : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <div className="font-medium text-slate-900">
                        {r.patientName}
                      </div>
                      {(r.relation || r.patientAge) && (
                        <div className="text-[11px] text-slate-400">
                          {[r.relation, r.patientAge].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {r.requiredService}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {formatClientDate(r.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.phone && (
                          <>
                            <a
                              href={telHref(r.phone)}
                              onClick={(e) => e.stopPropagation()}
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
                              onClick={(e) => e.stopPropagation()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-[#128C4A] hover:bg-[#0e703b] text-white text-xs font-bold transition shadow-2xs leading-none whitespace-nowrap select-none"
                              aria-label={`WhatsApp ${r.name}`}
                            >
                              <Icon name="wa" size={14} className="text-white" />
                              <span>WhatsApp</span>
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Advanced Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(s) => setPageSize(s)}
          itemName="clients"
        />
      </section>
    </div>
  );
}
