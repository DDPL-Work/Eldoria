import { useState, useEffect, useCallback } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { CityDropdown } from '../common/CityDropdown';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { useStore } from '../../context/StoreContext';
import { fmtDate, todayISO, ACTIVE } from '../../constants/data';

export function Bookings({ onOpenBooking, onNewBooking }) {
  const {
    inCity,
    // bookingsAll,
    cityName,
    bCity,
    svcB,
    data,
    selectedCity,
    // setSelectedCity,
    // cities,
    backendBookings,
    bookingsPagination,
    bookingsLoading,
    bookingsError,
    fetchBookings
  } = useStore();

  const [filter, setFilter] = useState('active');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filter, query, or city changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, filter, query]);

  // Load bookings from Backend API
  const loadBookings = useCallback(() => {
    const params = {
      page: currentPage,
      limit: 20
    };

    if (selectedCity && selectedCity !== 'all') {
      params.city = selectedCity;
    }

    // 'active' is a multi-status frontend filter, not a single DB enum value
    if (filter && filter !== 'all' && filter !== 'active') {
      if (filter === 'today') {
        params.date = todayISO();
      } else {
        params.status = filter;
      }
    }

    if (query.trim()) {
      params.search = query.trim();
    }

    fetchBookings(params);
  }, [fetchBookings, selectedCity, filter, query, currentPage]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const q = query.trim().toLowerCase();

  const filterFn = {
    active: (b) => ACTIVE.includes(b.status),
    requested: (b) => b.status === 'requested',
    today: (b) => b.date === todayISO(),
    completed: (b) => b.status === 'completed',
    cancelled: (b) => b.status === 'cancelled',
    all: () => true
  }[filter] || (() => true);

  // Strictly real backend bookings from API — no fake demo bookings
  const rawList = Array.isArray(backendBookings) ? backendBookings : [];

  const list = inCity(rawList)
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
      return data?.staff?.[sid]?.name || 'Staff';
    }
    return actor;
  };

  return (
    <div className="p-3.5 sm:p-4 max-w-[1440px] mx-auto space-y-3">
      {/* 1. TOP CITY SELECTOR & LIVE REFRESH BUTTON */}
      <div className="flex items-center justify-between gap-3">
        <CityDropdown />

        {/* Live Refresh Button */}
        <button
          type="button"
          onClick={loadBookings}
          disabled={bookingsLoading}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 rounded-lg px-3 py-1.5 shadow-2xs transition cursor-pointer text-slate-700 text-xs font-semibold select-none disabled:opacity-60"
          title="Refresh bookings"
        >
          <RiRefreshLine
            className={`text-base ${
              bookingsLoading ? 'animate-spin text-[#0E2F5A]' : 'text-slate-600'
            }`}
          />
          <span className="hidden sm:inline">{bookingsLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Non-blocking API Notice */}
      {bookingsError && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-600 font-bold shrink-0">⚠️ API Notice:</span>
            <span className="truncate">{bookingsError}</span>
          </div>
          <button
            type="button"
            onClick={loadBookings}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. HEADER: Bookings Title & + New Booking Button */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bookings</h1>
        {/* <button
          type="button"
          onClick={onNewBooking}
          className="bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition shrink-0 cursor-pointer"
        >
          <span className="text-base leading-none font-black">+</span>
          <span>New booking</span>
        </button> */}
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
                  ? 'bg-[#E4ECF7] border-1 border-[#0E2F5A] text-[#0E2F5A] font-extrabold shadow-2xs'
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
            className="w-full sm:w-[280px] bg-white border border-slate-200/90 rounded-lg px-3.5 py-2 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] shadow-2xs transition"
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
      <section className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
        {bookingsLoading ? (
          <DatabaseLoader
            title="Fetching Bookings from Database..."
            subtitle="Connecting to Eldoria backend server"
          />
        ) : bookingsError ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm">Bookings Not Fetched</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {bookingsError || 'Failed to retrieve bookings from the server. Please check database connection.'}
              </p>
            </div>
            <button
              type="button"
              onClick={loadBookings}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0E2F5A] hover:bg-[#153f77] text-white text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
            >
              <RiRefreshLine className="text-sm" />
              <span>Retry Fetch</span>
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center shadow-2xs">
              <Icon name="cal" size={26} className="text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {query
                  ? 'No Matching Bookings Found'
                  : filter !== 'all'
                  ? `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Bookings Found`
                  : 'No Bookings in Database'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {query
                  ? `No booking records match "${query}". Check spelling or clear your search query.`
                  : filter !== 'all'
                  ? `There are currently 0 bookings with status "${filter}". Try selecting "All" or check other tabs.`
                  : 'Currently 0 bookings exist in the database. New appointments booked by clients or added manually will appear here in real time.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Clear Search
                </button>
              )}
              {filter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  View All Bookings
                </button>
              )}
              <button
                type="button"
                onClick={loadBookings}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
              >
                <RiRefreshLine className="text-xs" />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={onNewBooking}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#F59E0B] hover:bg-[#d98b06] text-slate-900 text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
              >
                <span>+ New Booking</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full text-left text-xs table-fixed">
              <thead>
                <tr className="bg-[#dfe4e9] text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 pl-4 pr-2 w-[19%]">BOOKING</th>
                  <th className="py-2.5 px-2 w-[8%]">CITY</th>
                  <th className="py-2.5 px-2 w-[14%]">PATIENT</th>
                  <th className="py-2.5 px-2 w-[16%]">SERVICE</th>
                  <th className="py-2.5 px-2 w-[11%]">WHEN</th>
                  <th className="py-2.5 px-2 w-[15%]">STAFF</th>
                  <th className="py-2.5 pl-2 pr-4 w-[17%] text-right whitespace-nowrap">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {list.map((b) => {
                  const s = svcB(b);
                  const st = b.assignedStaff
                    ? {
                        name: b.assignedStaff.user?.name || b.assignedStaff.name || 'Staff',
                        phone: b.assignedStaff.user?.phone || b.assignedStaff.phone || '',
                        qualification: b.assignedStaff.qualification || b.assignedStaff.role || '',
                      }
                    : data?.staff?.[b.staffId];

                  const isToday = b.date === todayISO();
                  const whenDate = isToday ? 'Today' : fmtDate(b.date);
                  const displayCity = b.cityName || cityName(bCity(b) || b.city);
                  const displayService = b.serviceName || s?.name || b.service || 'Service';

                  return (
                    <tr
                      key={b.id || b.code}
                      onClick={() => onOpenBooking(b.id || b.code)}
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
                        {displayCity}
                      </td>

                      {/* PATIENT Column */}
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-800 text-xs sm:text-[13px] leading-snug truncate">
                          {b.patientName}
                        </div>
                        {b.patientAge && (
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug truncate">
                            Age {String(b.patientAge).replace(/^age\s*/i, '')}
                          </div>
                        )}
                      </td>

                      {/* SERVICE Column */}
                      <td className="py-3 px-2">
                        <div className="font-medium text-slate-800 text-xs sm:text-[13px] leading-snug truncate">
                          {displayService}
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
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-xs leading-snug truncate">
                              {st.name}
                            </div>
                            {(st.qualification || st.role) && (
                              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug whitespace-nowrap">
                                {st.qualification || st.role}
                              </div>
                            )}
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
                      <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                        <StatusBadge status={b.status} type="booking" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. PAGINATION FOOTER */}
        {bookingsPagination && bookingsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100 text-xs text-slate-600">
            <div>
              Showing page <span className="font-bold text-slate-900">{bookingsPagination.currentPage}</span> of{' '}
              <span className="font-bold text-slate-900">{bookingsPagination.totalPages}</span>{' '}
              ({bookingsPagination.total} total bookings)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!bookingsPagination.hasPrevPage && currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(bookingsPagination.totalPages, p + 1))
                }
                disabled={
                  !bookingsPagination.hasNextPage && currentPage >= bookingsPagination.totalPages
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
