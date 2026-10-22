import { useEffect } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { CityDropdown } from '../common/CityDropdown';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { useStore } from '../../context/StoreContext';
// import { useUI } from '../../context/UIContext';
import {
  fmtDate,
  todayISO,
  byDateTime,
  DEFAULT_CITIES,
  DOW,
  MON
} from '../../constants/data';
import EcgWaveAnimation from '../common/EcgWaveAnimation';

export function Dashboard({ onTab, onOpenBooking, onNewBooking }) {
  // const { showToast } = useUI();
  const {
    selectedCity,
    setSelectedCity,
    inCity,
    bookingsAll,
    staffList,
    enqAll,
    applications,
    apprOf,
    // cities,
    cityName,
    bCity,
    svcB,
    // setStatus,
    // assign,
    // unassign,
    // notify,
    dashboardData,
    dashboardLoading,
    dashboardError,
    fetchDashboard,
    fetchStaffRequests
  } = useStore();

  // Fetch live dashboard metrics and staff requests on mount and when selectedCity changes
  useEffect(() => {
    fetchDashboard(selectedCity || 'all');
    fetchStaffRequests?.({ approval: 'all', limit: 100 });
  }, [fetchDashboard, fetchStaffRequests, selectedCity]);

  // Date and greeting helpers
  const d = new Date();
  const hr = d.getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const dayName = DOW[d.getDay()];
  const monthName = MON[d.getMonth()];
  const dateNum = d.getDate();
  const year = d.getFullYear();

  // Fallback local calculations if API is connecting/offline
  const all = inCity(bookingsAll());
  const t = todayISO();
  const st = inCity(staffList(), (s) => s.city || DEFAULT_CITIES[0].id);

  const fallbackNewReq = all.filter((b) => b.status === 'requested');
  const fallbackTodayV = all.filter((b) => b.date === t && b.status !== 'cancelled');
  const fallbackUnassigned = all.filter(
    (b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId
  );
  const fallbackQueue = all
    .filter((b) => ['requested', 'confirmed'].includes(b.status))
    .sort(byDateTime);

  const fallbackHelpRequests = inCity(enqAll(), (e) => e.city).filter((e) => e.status === 'new');
  const fallbackPendingApps = inCity(applications()).filter((x) => apprOf(x) === 'pending');

  const countNewReqFallback = fallbackNewReq.length;
  const countTodayVisitsFallback = fallbackTodayV.length;
  const countTodayCompletedFallback = fallbackTodayV.filter((b) => b.status === 'completed').length;
  const countTodayOpenFallback = Math.max(0, countTodayVisitsFallback - countTodayCompletedFallback);
  const countStaffOnDutyFallback = st.filter((s) => s.onDuty).length;
  const countStaffTotalFallback = st.length;
  const countUnassignedFallback = fallbackUnassigned.length;

  const targetCityIds = ['mumbai', 'thane', 'navi-mumbai', 'pune'];
  const fallbackByCityRows = targetCityIds.map((cid) => {
    const cName = cityName(cid);
    const cBookings = bookingsAll().filter((b) => bCity(b) === cid);
    const cNewReq = cBookings.filter((b) => b.status === 'requested').length;
    const cOpen = cBookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
    const cVisitsToday = cBookings.filter((b) => b.date === t && b.status !== 'cancelled').length;
    const cUnassigned = cBookings.filter((b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId).length;
    const cStaff = staffList().filter((s) => (s.city || 'mumbai') === cid);
    const cStaffOnDuty = cStaff.filter((s) => s.onDuty).length;
    const cStaffTotal = cStaff.length;

    return {
      id: cid,
      name: cName,
      newReq: cNewReq,
      openBookings: cOpen,
      visitsToday: cVisitsToday,
      unassigned: cUnassigned,
      staffOnDuty: cStaffOnDuty,
      staffTotal: cStaffTotal
    };
  });

  // 1. Resolve Banner Details from Backend API
  const bannerGreeting = dashboardData?.banner?.greeting || greet;
  const bannerDate = dashboardData?.banner?.dateString || `${dayName}, ${dateNum} ${monthName} ${year}`;
  const bannerTitle = dashboardData?.banner?.title || `Care desk${selectedCity !== 'all' ? ` · ${cityName(selectedCity)}` : ''}`;
  const bannerSubtitle = dashboardData?.banner?.subtitle || `${countNewReqFallback} new request${countNewReqFallback === 1 ? '' : 's'} waiting for confirmation`;

  // 2. Resolve KPI Metrics from Backend API
  const kpiNewReq = dashboardData?.kpis?.newRequests?.count ?? countNewReqFallback;
  const kpiVisitsToday = dashboardData?.kpis?.visitsToday?.count ?? countTodayVisitsFallback;
  const kpiVisitsSublabel = dashboardData?.kpis?.visitsToday?.sublabel ?? `${countTodayCompletedFallback} completed · ${countTodayOpenFallback} open`;
  const kpiStaffOnDuty = dashboardData?.kpis?.staffOnDuty?.count ?? countStaffOnDutyFallback;
  const kpiStaffSublabel = dashboardData?.kpis?.staffOnDuty?.sublabel ?? `of ${countStaffTotalFallback} staff`;
  const kpiUnassigned = dashboardData?.kpis?.unassigned?.count ?? countUnassignedFallback;

  // 3. Resolve Alerts from Backend API
  const helpRequestsItems = dashboardData?.alerts?.helpRequests?.items || fallbackHelpRequests;
  const helpRequestsCount = dashboardData?.alerts?.helpRequests?.count ?? helpRequestsItems.length;

  const pendingAppsItems = dashboardData?.alerts?.staffApplications?.items || fallbackPendingApps;
  const pendingAppsCount = dashboardData?.alerts?.staffApplications?.count ?? pendingAppsItems.length;

  // 4. Resolve Queue & Staff Availability
  const queue = (dashboardData?.needsAction && Array.isArray(dashboardData.needsAction) && dashboardData.needsAction.length > 0)
    ? dashboardData.needsAction
    : fallbackQueue;

  const rawStaffAvailability = (dashboardData?.staffAvailability && Array.isArray(dashboardData.staffAvailability) && dashboardData.staffAvailability.length > 0)
    ? dashboardData.staffAvailability
    : st;

  // Ensure staff availability has additional active staff to increase height and match Needs Action
  const staffAvailability = (() => {
    const list = [...rawStaffAvailability];

    // const existingNames = new Set(list.map((s) => (s.name || '').toLowerCase().trim()));

    // const supplementaryStaff = [
    //   { id: 'st_extra_1', staffId: 'STF-105', name: 'Vikram Shinde', role: 'Physiotherapist', qualification: 'Physiotherapist', city: 'mumbai', cityName: 'Mumbai', area: 'Powai, Ghatkopar', onDuty: true },
    //   { id: 'st_extra_2', staffId: 'STF-106', name: 'Pooja Deshmukh', role: 'GNM Nurse', qualification: 'GNM Nurse', city: 'mumbai', cityName: 'Mumbai', area: 'Juhu, Vile Parle', onDuty: true },
    //   { id: 'st_extra_3', staffId: 'STF-107', name: 'Sushma More', role: 'Elder Caregiver', qualification: 'Elder Caregiver', city: 'mumbai', cityName: 'Mumbai', area: 'Borivali, Kandivali', onDuty: true },
    //   { id: 'st_extra_4', staffId: 'STF-108', name: 'Sunil Verma', role: 'Attendant', qualification: 'Attendant', city: 'mumbai', cityName: 'Mumbai', area: 'Chembur, Kurla', onDuty: false },
    // ];

    // supplementaryStaff.forEach((s) => {
    //   if (!existingNames.has(s.name.toLowerCase().trim())) {
    //     if (selectedCity === 'all' || (s.city || '').toLowerCase() === (selectedCity || '').toLowerCase()) {
    //       list.push(s);
    //       existingNames.add(s.name.toLowerCase().trim());
    //     }
    //   }
    // });

    return list;
  })();

  const byCityRows = (dashboardData?.byCity && Array.isArray(dashboardData.byCity) && dashboardData.byCity.length > 0)
    ? dashboardData.byCity
    : fallbackByCityRows;

  // Action: Confirm booking
  // const handleConfirm = (b) => {
  //   setStatus(b, 'confirmed', { confirmedBy: 'admin', confirmedAt: Date.now() }, 'admin');
  //   notify(
  //     'client:' + (b.clientPhone || ''),
  //     'Booking confirmed',
  //     `Your ${b.serviceName || svcB(b)?.name || 'care'} booking ${b.code} is confirmed for ${b.whenFormatted || `${fmtDate(b.date)}, ${b.time}`}. We'll assign a caregiver next.`,
  //     b.id
  //   );
  //   showToast?.(`Booking ${b.code || ''} confirmed`);
  // };

  // Source badge styling
  const renderSourceBadge = (source) => {
    const s = String(source || 'App').toLowerCase();
    if (s.includes('wa') || s.includes('whatsapp')) {
      return (
        <span className="bg-[#e6f7ec] text-[#13803f] text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block">
          WhatsApp
        </span>
      );
    }
    if (s.includes('call') || s.includes('phone')) {
      return (
        <span className="bg-[#f0f2f5] text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block">
          Call
        </span>
      );
    }
    return (
      <span className="bg-[#e0effa] text-[#1a649f] text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block">
        App
      </span>
    );
  };

  // Staff avatar initials
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-4 max-w-[1440px] mx-auto space-y-4 sm:space-y-4">
      {/* 4. DASHBOARD HEADER - Styled City Selector & Live Refresh */}
      <div className="flex items-center justify-between gap-3">
        <CityDropdown />

        {/* Live Refresh Button */}
        <button
          type="button"
          onClick={() => fetchDashboard(selectedCity || 'all')}
          disabled={dashboardLoading}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 rounded-lg px-3 py-1.5 shadow-2xs transition cursor-pointer text-slate-700 text-xs font-semibold select-none disabled:opacity-60"
          title="Refresh dashboard metrics"
        >
          <RiRefreshLine
            className={`text-base ${
              dashboardLoading ? 'animate-spin text-[#0E2F5A]' : 'text-slate-600'
            }`}
          />
          <span className="hidden sm:inline">{dashboardLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Non-blocking API Status / Error Notice */}
      {dashboardError && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-600 font-bold shrink-0">⚠️ API Notice:</span>
            <span className="truncate">{dashboardError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboard(selectedCity || 'all')}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}



     {/* 5. CARE DESK HERO BANNER */}
<section
  className="relative isolate overflow-hidden rounded-lg
  bg-[linear-gradient(100deg,#0E386E_0%,#13447E_40%,#0E3360_80%,#0A2447_100%)]
  p-5 sm:p-6 text-white shadow-md border border-[#1b4d88]/40 select-none"
>
  {/* Animated ECG Background */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 top-1/2
    z-0 -translate-y-1/2 opacity-[0.45]"
  >
    <EcgWaveAnimation />
  </div>

  {/* Optional subtle overlay to preserve text readability */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 z-0
    bg-gradient-to-r from-[#0E386E]/20 via-transparent to-[#0A2447]/30"
  />

  {/* Foreground Content */}
  <div
    className="relative z-10 flex flex-col sm:flex-row
    items-start sm:items-center justify-between gap-4 sm:gap-6"
  >
    {/* Left: Logo + Greeting */}
    <div className="flex items-center gap-3.5 sm:gap-4.5">
      <div
        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full
        bg-white shadow-md flex items-center justify-center
        p-0.5 shrink-0 overflow-hidden"
      >
        <img
          src="/eldoria-logo.png"
          alt="Eldoria+ Care at Home"
          className="w-full h-full object-contain"
        />
      </div>

      <div>
        <p className="text-slate-300 text-xs sm:text-[13px] font-medium leading-none">
          {bannerGreeting} · {bannerDate}
        </p>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mt-1.5">
          {bannerTitle}
        </h1>

        <p className="text-[#f59e0b] font-bold text-xs sm:text-sm mt-1 leading-snug">
          {bannerSubtitle}
        </p>
      </div>
    </div>

    {/* Right: New Booking Button */}
    <button
      type="button"
      onClick={onNewBooking}
      className="bg-[#f59e0b] hover:bg-[#e69107]
      text-[#0c1f36] font-bold text-xs sm:text-sm
      px-4 py-2.5 rounded-lg flex items-center gap-2
      shadow-xs transition shrink-0 cursor-pointer"
    >
      <span className="text-lg leading-none font-extrabold">
        +
      </span>

      <span>New booking</span>
    </button>
  </div>
</section>
      {/* 6. KPI CARDS - Smooth linear gradient top border as shown in reference image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: New requests */}
        <div className="relative w-full bg-white rounded-xl border border-slate-200/90 overflow-hidden p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          {/* Top Gradient Accent Border */}
          <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-[linear-gradient(90deg,#0A2342_0%,#112E53_18%,#6B5528_38%,#BD8212_60%,#F59E0B_100%)]" />
          <span className="text-xs sm:text-[13px] font-semibold text-slate-500 block pt-0.5">New requests</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#A15C07] tabular-nums my-1 leading-none">
            {kpiNewReq}
          </div>
          <span className="text-xs text-slate-400 block">Awaiting confirmation</span>
        </div>

        {/* KPI 2: Visits today */}
        <div className="relative w-full bg-white rounded-xl border border-slate-200/90 overflow-hidden p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          {/* Top Gradient Accent Border */}
          <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-[linear-gradient(90deg,#0A2342_0%,#112E53_18%,#6B5528_38%,#BD8212_60%,#F59E0B_100%)]" />
          <span className="text-xs sm:text-[13px] font-semibold text-slate-500 block pt-0.5">Visits today</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums my-1 leading-none">
            {kpiVisitsToday}
          </div>
          <span className="text-xs text-slate-400 block">
            {kpiVisitsSublabel}
          </span>
        </div>

        {/* KPI 3: Staff on duty */}
        <div className="relative w-full bg-white rounded-xl border border-slate-200/90 overflow-hidden p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          {/* Top Gradient Accent Border */}
          <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-[linear-gradient(90deg,#0A2342_0%,#112E53_18%,#6B5528_38%,#BD8212_60%,#F59E0B_100%)]" />
          <span className="text-xs sm:text-[13px] font-semibold text-slate-500 block pt-0.5">Staff on duty</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums my-1 leading-none">
            {kpiStaffOnDuty}
          </div>
          <span className="text-xs text-slate-400 block">{kpiStaffSublabel}</span>
        </div>

        {/* KPI 4: Unassigned */}
        <div className="relative w-full bg-white rounded-xl border border-slate-200/90 overflow-hidden p-4.5 sm:p-5 shadow-2xs flex flex-col justify-between min-h-[120px]">
          {/* Top Gradient Accent Border */}
          <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-[linear-gradient(90deg,#0A2342_0%,#112E53_18%,#6B5528_38%,#BD8212_60%,#F59E0B_100%)]" />
          <span className="text-xs sm:text-[13px] font-semibold text-slate-500 block pt-0.5">Unassigned</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#991B1B] tabular-nums my-1 leading-none">
            {kpiUnassigned}
          </div>
          <span className="text-xs text-slate-400 block">Need a nurse or caregiver</span>
        </div>
      </div>

      {/* 7. HELP REQUEST ALERT (Displayed conditionally) */}
      {helpRequestsCount > 0 && (
        <div className="w-full bg-[#edf4fb] border border-[#d2e2f2] rounded-xl px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 sm:gap-4 shadow-2xs">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-full bg-[#0d2238] text-white flex items-center justify-center shrink-0">
              <Icon name="help" size={18} strokeWidth={2.4} />
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block text-xs sm:text-sm truncate">
                {helpRequestsCount} new help request{helpRequestsCount === 1 ? '' : 's'}: customers not sure what care they need
              </span>
              <span className="text-xs text-slate-500 truncate block mt-0.5">
                {helpRequestsItems
                  .slice(0, 2)
                  .map((e) => `${e.clientName || 'Client'} (${e.patientType || 'Elderly care'})`)
                  .join(', ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTab('enquiries')}
            className="shrink-0 bg-[#0E2F5A] hover:bg-[#163D70] active:scale-[0.98] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
          >
            Call &amp; recommend
          </button>
        </div>
      )}

      {/* 8. STAFF APPLICATION ALERT (Displayed conditionally) */}
      {pendingAppsCount > 0 && (
        <div className="w-full bg-[#fef7eb] border border-[#fde4ba] rounded-xl px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 sm:gap-4 shadow-2xs">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#f59e0b] text-[#0d2238] flex items-center justify-center shrink-0 font-bold">
              <Icon name="shield" size={18} strokeWidth={2.4} />
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block text-xs sm:text-sm truncate">
                {pendingAppsCount} staff application{pendingAppsCount === 1 ? '' : 's'} waiting for review
              </span>
              <span className="text-xs text-slate-500 truncate block mt-0.5">
                {pendingAppsItems.map((x) => `${x.name} (${x.role || 'Staff'})`).join(', ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTab('onboarding')}
            className="shrink-0 bg-[#0E2F5A] hover:bg-[#163D70] active:scale-[0.98] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
          >
            Review
          </button>
        </div>
      )}

      {/* 9 & 10. SPLIT SECTION: NEEDS ACTION VS STAFF AVAILABILITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 9. NEEDS ACTION SECTION (Left ~65% / 8 cols) */}
        <section className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">Needs action</h2>
            <button
              type="button"
              onClick={() => onTab('bookings')}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              All bookings
            </button>
          </div>

          {/* Table with overflow container & whitespace-nowrap columns */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
              <thead>
                <tr className="bg-[#f1f5f9] text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">CLIENT</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">CITY</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">SERVICE</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">WHEN</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold whitespace-nowrap">SOURCE</th>
                  <th className="py-2.5 px-3.5 sm:px-4 font-bold text-right whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardLoading ? (
                  <tr>
                    <td colSpan={6} className="py-4">
                      <DatabaseLoader
                        title="Fetching Dashboard from Database..."
                        subtitle="Connecting to Eldoria backend server"
                      />
                    </td>
                  </tr>
                ) : queue.length === 0 ? (
                  <tr className="text-center py-8">
                    <td colSpan={6} className="py-8 text-slate-400 text-xs">
                      No bookings currently need action
                    </td>
                  </tr>
                ) : (
                  queue.slice(0, 8).map((b) => {
                    const isToday = b.isToday ?? (b.date === t);
                    const whenFormatted =
                      b.whenFormatted ||
                      (isToday ? `Today, ${b.time}` : `${fmtDate(b.date)}, ${b.time}`);

                    const displayCity = b.cityName || cityName(bCity(b) || b.city);
                    const displayService = b.serviceName || svcB(b)?.name || b.service || 'Service';

                    return (
                      <tr key={b.id || b.code} className="hover:bg-slate-50/60 transition">
                        {/* CLIENT Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenBooking(b.id)}
                            className="text-left group cursor-pointer block"
                          >
                            <div className="font-bold text-slate-900 text-xs sm:text-[13px] group-hover:text-teal-700 whitespace-nowrap leading-snug">
                              {b.clientName}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap leading-snug">
                              {b.patientName} · {b.code}
                            </div>
                          </button>
                        </td>

                        {/* CITY Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 text-slate-700 text-xs font-medium whitespace-nowrap">
                          {displayCity}
                        </td>

                        {/* SERVICE Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-800 text-xs sm:text-[13px] whitespace-nowrap leading-snug">
                            {displayService}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap leading-snug">
                            {b.plan || 'Single visit'}
                          </div>
                        </td>

                        {/* WHEN Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 text-xs text-slate-700 font-medium whitespace-nowrap">
                          {whenFormatted}
                        </td>

                        {/* SOURCE Column */}
                        <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                          {renderSourceBadge(b.source)}
                        </td>

                        {/* ACTION Column: View button redirects to booking detail page where full action workflow takes place */}
                        <td className="py-2.5 px-3.5 sm:px-4 text-right whitespace-nowrap">
                          {/* View button to open booking details page */}
                          <button
                            type="button"
                            onClick={() => onOpenBooking(b.id || b.code)}
                            className="bg-[#0E2F5A] hover:bg-[#163D70] active:scale-[0.98] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                          >
                            <Icon name="eye" size={13} strokeWidth={2.2} />
                            <span>View</span>
                          </button>

                          {/* 
                            NOTE: Confirm and Assign staff actions commented out as per requirement.
                            Action workflow (confirm, matching staff assign, unassign, status updates)
                            is managed directly on the dedicated BookingDetailPage.

                          {b.status === 'requested' ? (
                            <button
                              type="button"
                              onClick={() => handleConfirm(b)}
                              className="bg-[#0E2F5A] hover:bg-[#163D70] active:scale-[0.98] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs inline-block"
                            >
                              Confirm
                            </button>
                          ) : (() => {
                            // Combine staff from Redux store and dashboardData.staffAvailability
                            const rawStaffList = staffList();
                            const dashStaff = (dashboardData?.staffAvailability || []).map((s) => ({
                              id: String(s.staffId || s.id),
                              staffId: s.staffId || String(s.id),
                              name: s.name,
                              role: s.role || 'Caregiver',
                              city: (s.city || 'mumbai').toLowerCase().trim(),
                              onDuty: Boolean(s.onDuty),
                              approval: s.approval || 'approved',
                            }));
                            const staffMap = new Map();
                            dashStaff.forEach((s) => staffMap.set(String(s.id), s));
                            rawStaffList.forEach((s) => staffMap.set(String(s.id || s.staffId), s));
                            const stList = Array.from(staffMap.values());

                            const defaultCityId = DEFAULT_CITIES[0]?.id || 'mumbai';
                            const bc = String(b.city || bCity(b) || defaultCityId).toLowerCase().trim();
                            const local = stList.filter(
                              (s) => String(s.city || defaultCityId).toLowerCase().trim() === bc
                            );
                            const other = stList.filter(
                              (s) => String(s.city || defaultCityId).toLowerCase().trim() !== bc
                            );
                            return (
                              <select
                                aria-label={`Assign staff for ${b.code}`}
                                value={b.staffId || ''}
                                onChange={(e) => {
                                  const sid = e.target.value;
                                  if (sid) {
                                    assign(b.id, sid, 'admin');
                                    showToast?.('Staff assigned');
                                  } else {
                                    unassign(b.id);
                                    showToast?.('Staff unassigned');
                                  }
                                }}
                                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-[13px] font-medium px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] transition max-w-[200px]"
                              >
                                <option value="">
                                  {stList.length
                                    ? local.length
                                      ? 'Assign staff..'
                                      : `No staff in ${cityName(bc)}`
                                    : 'Add staff first'}
                                </option>
                                {local.length > 0 && (
                                  <optgroup label={`In ${cityName(bc)}`}>
                                    {local.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} · {s.role}{!s.onDuty ? ' (off duty)' : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {other.length > 0 && (
                                  <optgroup label="Other cities">
                                    {other.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name} · {s.role}{!s.onDuty ? ' (off duty)' : ''} · {cityName(s.city || defaultCityId)}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            );
                          })()}
                          */}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>



        {/* 10. STAFF AVAILABILITY SECTION (Right ~35% / 4 cols) */}
        <section className="lg:col-span-4 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">Staff availability</h2>
            <button
              type="button"
              onClick={() => onTab('staff')}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Manage
            </button>
          </div>

          {/* Staff Rows */}
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {staffAvailability.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No staff found</div>
            ) : (
              staffAvailability.slice(0, 8).map((s) => (
                <div
                  key={s.id || s.staffId}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Circle Initials Avatar matching Peach tone */}
                    <div className="w-8 h-8 rounded-full bg-[#fed7aa] text-[#9a3412] font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(s.name)}
                    </div>
                    {/* Staff Details */}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-[13px] truncate leading-snug">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 leading-snug">
                        {s.role || s.qualification || 'Caregiver'} · {s.cityName || cityName(s.city || 'mumbai')}
                        {s.area ? `, ${s.area}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 text-right">
                    {s.onDuty ? (
                      <span className="text-[#15803d] font-bold text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />
                        Available
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Off duty
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 11. BY CITY SECTION (Shown when "All cities" is selected) */}
      {selectedCity === 'all' && (
        <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base">By city</h2>
            <button
              type="button"
              onClick={() => onTab('cities')}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Manage cities
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#f1f5f9] text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4.5 font-bold whitespace-nowrap">CITY</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">NEW REQUESTS</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">OPEN BOOKINGS</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">VISITS TODAY</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">UNASSIGNED</th>
                  <th className="py-2.5 px-4 font-bold whitespace-nowrap">STAFF ON DUTY</th>
                  <th className="py-2.5 px-4.5 font-bold text-right whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byCityRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4.5 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {row.newReq}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {row.openBookings}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {row.visitsToday}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {row.unassigned > 0 ? (
                        <span className="text-[#dc2626] font-bold text-xs sm:text-sm">{row.unassigned}</span>
                      ) : (
                        <span className="text-slate-800 text-xs sm:text-sm font-semibold">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                      {row.staffTotal === 0 ? (
                        <span className="text-slate-500 font-medium inline-flex items-center gap-1.5">
                          0 of 0
                          <span className="bg-[#fef3c7] text-[#92400e] text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
                            No staff
                          </span>
                        </span>
                      ) : (
                        <span className="font-medium text-slate-800">
                          {row.staffOnDuty} of {row.staffTotal}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCity(row.id)}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1 rounded-lg transition cursor-pointer"
                      >
                        View
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
