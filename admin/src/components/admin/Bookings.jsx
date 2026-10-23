import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { CityDropdown } from '../common/CityDropdown';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { useStore } from '../../context/StoreContext';
import { fmtDate, todayISO, ACTIVE } from '../../constants/data';
import { bookingAPI } from '../../services/api';
import bookingErrorImg from '../../assets/booking-error.png';
import { Pagination } from '../common/Pagination';

const FILTER_OPTIONS = [
  { id: 'requested', label: 'New requests' },
  { id: 'active', label: 'Active' },
  { id: 'date_exceeded', label: 'Date exceeded' },
  { id: 'today', label: 'Today' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All bookings' }
];

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

  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status');
  const [filter, setFilter] = useState(urlStatus || 'requested');

  useEffect(() => {
    if (urlStatus && urlStatus !== filter) {
      setFilter(urlStatus);
    }
  }, [urlStatus]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Close filter dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset page when filter, query, or city changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, filter, query]);

  // Load bookings from Backend API (fetches all city records so active tab and all dropdown tabs paginate identically to Staff)
  const loadBookings = useCallback(() => {
    const params = {
      limit: 1000
    };

    if (selectedCity && selectedCity !== 'all') {
      params.city = selectedCity;
    }

    if (query.trim()) {
      params.search = query.trim();
    }

    fetchBookings(params);
  }, [fetchBookings, selectedCity, query]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const q = query.trim().toLowerCase();

  const filterFn = {
    active: (b) => ACTIVE.includes(b.status),
    // New requests: any booking whose status is 'requested', OR any active booking with no staff assigned yet
    requested: (b) => b.status === 'requested' || (!b.staffId && !b.assignedStaff && b.status === 'confirmed'),
    date_exceeded: (b) => b.status === 'date_exceeded' || (Boolean(b.date) && b.date < todayISO() && !['completed', 'cancelled'].includes(b.status)),
    today: (b) => b.date === todayISO(),
    completed: (b) => b.status === 'completed',
    cancelled: (b) => b.status === 'cancelled',
    all: () => true
  }[filter] || (() => true);

  // Normalize booking status & sort by newest first
  const seenCodes = new Set();
  const todayStr = todayISO();
  const rawList = (Array.isArray(backendBookings) ? backendBookings : [])
    .map((b) => {
      // If scheduled date has passed without completion or cancellation, normalize to 'date_exceeded'
      if (b.date && b.date < todayStr && !['completed', 'cancelled'].includes(b.status)) {
        return { ...b, status: 'date_exceeded' };
      }
      // If staff is already assigned, ensure status is 'assigned' so it doesn't linger in requested
      if ((b.staffId || b.assignedStaff) && b.status === 'requested') {
        return { ...b, status: 'assigned' };
      }
      // If no staff is assigned yet and status is confirmed, treat as pending request waiting for staff
      if (!b.staffId && !b.assignedStaff && b.status === 'confirmed') {
        return { ...b, status: 'requested' };
      }
      return b;
    })
    .filter((b) => {
      if (!b) return false;
      const key = b.code || b.id;
      if (key && seenCodes.has(key)) return false;
      if (key) seenCodes.add(key);
      return true;
    })
    .sort((a, b) => {
      const parseTime = (item) => {
        if (item.createdAt) return new Date(item.createdAt).getTime();
        if (item.date) return new Date(item.date).getTime();
        return 0;
      };
      return parseTime(b) - parseTime(a);
    });

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

  // Pagination calculation (matches Staff.jsx behavior)
  const totalCount = list.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const displayList = list.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
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
    <div className="px-3.5 sm:px-4 py-2 sm:py-2.5 max-w-[1440px] mx-auto space-y-2.5">
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

      {/* 2. HEADER: Bookings Title & + New Booking Button */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bookings</h1>
        <button
          type="button"
          onClick={onNewBooking}
          className="bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-extrabold text-xs sm:text-sm px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition shrink-0 cursor-pointer"
        >
          <span className="text-base leading-none font-black">+</span>
          <span>New booking</span>
        </button> 
      </div>

      {/* 3. TOOLS: Status Filter Dropdown & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Dropdown (Replaces horizontal scroller) */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="inline-flex items-center justify-between gap-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-1.5 sm:py-2 shadow-2xs transition cursor-pointer select-none text-xs sm:text-[13px] min-w-[200px]"
            aria-expanded={isFilterOpen}
            aria-haspopup="listbox"
          >
            <div className="flex items-center gap-2">
              <Icon name="filter" size={14} className="text-slate-500" />
              <span className="text-slate-400 font-medium">Status:</span>
              <span className="text-[#0E2F5A] font-extrabold">
                {FILTER_OPTIONS.find((opt) => opt.id === filter)?.label || 'Active'}
              </span>
            </div>
            <Icon
              name="down"
              size={12}
              className={`text-slate-400 transition-transform duration-150 ${isFilterOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isFilterOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-56 sm:w-60 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
              role="listbox"
            >
              <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Filter by Status
              </div>
              {FILTER_OPTIONS.map((opt) => {
                const isSelected = filter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setFilter(opt.id);
                      setSearchParams({ status: opt.id });
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs sm:text-[13px] transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#E4ECF7] text-[#0E2F5A] font-extrabold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="text-[#0E2F5A] font-black text-sm">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, code"
            aria-label="Search bookings"
            className="w-full sm:w-[280px] bg-white border border-slate-200/90 rounded-lg px-3.5 py-1.5 sm:py-2 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] shadow-2xs transition"
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
          <div className="flex flex-col items-center justify-center px-4 py-5 sm:py-6 text-center bg-white h-[calc(100vh-225px)] min-h-[340px] max-h-[560px] space-y-3">
            <div className="w-full max-w-[270px] sm:max-w-[310px] md:max-w-[340px] h-[145px] sm:h-[165px] md:h-[185px] flex items-center justify-center shrink-0">
              <img
                src={bookingErrorImg}
                alt="Bookings not fetched illustration"
                className="w-full h-full object-contain select-none pointer-events-none drop-shadow-xs"
                loading="lazy"
              />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm sm:text-base">Bookings Not Fetched</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
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
          <div className="flex flex-col items-center justify-center px-4 py-5 sm:py-6 text-center bg-white h-[calc(100vh-225px)] min-h-[340px] max-h-[560px] space-y-3">
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
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1040px]">
              <thead>
                <tr className="bg-[#dfe4e9] text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 pl-5 pr-4 w-[26%] min-w-[240px]">BOOKING</th>
                  <th className="py-3 px-4 w-[11%] min-w-[110px]">CITY</th>
                  <th className="py-3 px-4 w-[15%] min-w-[140px]">PATIENT</th>
                  <th className="py-3 px-4 w-[16%] min-w-[150px]">SERVICE</th>
                  <th className="py-3 px-4 w-[11%] min-w-[115px]">WHEN</th>
                  <th className="py-3 px-4 w-[10%] min-w-[110px]">STAFF</th>
                  <th className="py-3 pl-3 pr-5 w-[11%] min-w-[135px] text-right whitespace-nowrap">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayList.map((b) => {
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
                  const rawCity = b.cityName || cityName(bCity(b) || b.city);
                  const displayCity =
                    rawCity && rawCity !== '—'
                      ? String(rawCity).charAt(0).toUpperCase() + String(rawCity).slice(1)
                      : b.city
                      ? String(b.city).charAt(0).toUpperCase() + String(b.city).slice(1)
                      : '—';
                  const displayService = b.serviceName || s?.name || b.service || 'Service';

                  return (
                    <tr
                      key={b.id || b.code}
                      onClick={() => onOpenBooking(b.code)}
                      className="hover:bg-slate-50/60 transition cursor-pointer group align-middle"
                    >
                      {/* BOOKING Column */}
                      <td className="py-3.5 pl-5 pr-4 align-middle">
                        <div className="font-bold text-slate-900 group-hover:text-[#0E2F5A] text-xs sm:text-[13px] leading-snug truncate max-w-[220px]">
                          {b.clientName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 leading-none whitespace-nowrap">
                          <span className="font-mono text-slate-500 font-medium shrink-0">{b.code}</span>
                          <span className="text-slate-300 shrink-0">·</span>
                          <StatusBadge status={b.source} type="source" className="shrink-0" />
                        </div>
                      </td>

                      {/* CITY Column */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs sm:text-[13px] leading-snug">
                          {displayCity}
                        </div>
                        {b.area && (
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug truncate max-w-[120px]">
                            {b.area}
                          </div>
                        )}
                      </td>

                      {/* PATIENT Column */}
                      <td className="py-3.5 px-4 align-middle">
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
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-medium text-slate-800 text-xs sm:text-[13px] leading-snug truncate">
                          {displayService}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug truncate">
                          {b.plan || 'Single visit'}
                        </div>
                      </td>

                      {/* WHEN Column */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-800 leading-snug whitespace-nowrap">
                          {whenDate}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug whitespace-nowrap">
                          {b.time}
                        </div>
                      </td>

                      {/* STAFF Column */}
                      <td className="py-3.5 px-4 text-xs align-middle">
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
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap align-middle">
                        <StatusBadge status={b.status} type="booking" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. ADVANCED PAGINATION FOOTER */}
        <Pagination
          currentPage={safeCurrentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(s) => setPageSize(s)}
          itemName="bookings"
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </section>
    </div>
  );
}
