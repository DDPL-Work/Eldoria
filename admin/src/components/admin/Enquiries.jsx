import { useState, useEffect, useMemo, useCallback } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { CityDropdown } from '../common/CityDropdown';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { useStore } from '../../context/StoreContext';
import { useUI } from '../../context/UIContext';
import { enquiryAPI } from '../../services/api';
import { fmtTs } from '../../constants/data';

export function Enquiries({ onOpenEnquiry, onShowToast: onShowToastProp }) {
  const { showToast } = useUI ? useUI() : {};
  const onShowToast = onShowToastProp || showToast;

  const {
    inCity,
    enqAll,
    cityName,
    selectedCity,
    backendEnquiries,
    enquiriesCounts,
    enquiriesLoading,
    enquiriesError,
    fetchEnquiries,
    setEnquiryStatusLocally,
  } = useStore();

  const [filter, setFilter] = useState('open');
  const [updatingId, setUpdatingId] = useState(null);

  // 1. Fetch real help requests from backend: GET /api/v1/admin/enquiries/all
  const loadEnquiries = useCallback(() => {
    const params = {
      limit: 100,
    };
    if (filter && filter !== 'all') {
      params.filter = filter;
    }
    if (selectedCity && selectedCity !== 'all') {
      params.city = selectedCity;
    }
    fetchEnquiries?.(params);
  }, [fetchEnquiries, filter, selectedCity]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  const handleRefresh = () => {
    loadEnquiries();
    onShowToast?.('Refreshed help requests');
  };

  const all = useMemo(() => {
    let rawList = [];
    if (backendEnquiries && backendEnquiries.length > 0) {
      rawList = backendEnquiries;
    } else {
      rawList = enqAll();
    }
    return inCity(rawList, (e) => e.city);
  }, [backendEnquiries, enqAll, inCity]);

  const filterFn = useMemo(() => {
    return (
      {
        open: (e) => e.status === 'new' || e.status === 'contacted',
        new: (e) => e.status === 'new',
        converted: (e) => e.status === 'converted',
        closed: (e) => e.status === 'closed',
        all: () => true,
      }[filter] || (() => true)
    );
  }, [filter]);

  const list = useMemo(() => {
    return all.filter(filterFn);
  }, [all, filterFn]);

  const countFor = (k) => {
    if (enquiriesCounts && enquiriesCounts[k] !== undefined) {
      return enquiriesCounts[k];
    }
    const fn =
      {
        open: (e) => e.status === 'new' || e.status === 'contacted',
        new: (e) => e.status === 'new',
        converted: (e) => e.status === 'converted',
        closed: (e) => e.status === 'closed',
        all: () => true,
      }[k];
    return all.filter(fn || (() => true)).length;
  };

  // Quick Status Update via PATCH /api/v1/admin/enquiry/:id/status
  const handleQuickStatusChange = async (eItem, newStatus, ev) => {
    ev?.stopPropagation?.();
    const targetId = eItem.id || eItem.code;
    const toggleKey = String(targetId);

    if (updatingId === toggleKey) return;

    setUpdatingId(toggleKey);
    setEnquiryStatusLocally?.({ id: targetId, status: newStatus });

    try {
      await enquiryAPI.updateEnquiryStatus(targetId, { status: newStatus });
      onShowToast?.(`Request marked as ${newStatus}`);
      loadEnquiries();
    } catch (err) {
      console.error('Failed to update enquiry status via API:', err);
      setEnquiryStatusLocally?.({ id: targetId, status: eItem.status });
      onShowToast?.(err.message || 'Failed to update request status on server');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-4 w-full space-y-3">
      {/* 1. City Dropdown Pill at Top matching Booking & Dashboard */}
      <div className="flex items-center justify-between gap-3">
        <CityDropdown />
      </div>

      {/* Header Row: Title & Count on Left, Refresh Action on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help requests</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {countFor('new')} new · {countFor('open')} open · {countFor('all')} total
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={Boolean(enquiriesLoading)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <RiRefreshLine
              className={`text-sm ${
                enquiriesLoading ? 'animate-spin text-[#0E2F5A]' : 'text-slate-500'
              }`}
            />
            <span>{enquiriesLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
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
          ['all', 'All'],
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

      {/* Grid of Request Cards / Empty State / DatabaseLoader */}
      {enquiriesLoading && all.length === 0 ? (
        <DatabaseLoader
          title="Fetching Help Requests from Database..."
          subtitle="Connecting to Eldoria backend server"
        />
      ) : enquiriesError && all.length === 0 ? (
        <div className="bg-white rounded-xl p-10 border border-slate-200/90 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto text-lg font-bold">
            ✕
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Failed to load help requests</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{enquiriesError}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-1.5 bg-[#0E2F5A] text-white text-xs font-bold rounded-lg hover:bg-[#1a4478] transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : list.length === 0 ? (
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
          {list.map((e) => {
            const isUpdating = updatingId === String(e.id || e.code);
            return (
              <button
                key={e.id || e.code}
                type="button"
                onClick={() => onOpenEnquiry(e.id || e.code)}
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

                  {/* Recommendation pill if available */}
                  {e.adminNote && (
                    <div className="text-[11px] bg-slate-50 text-slate-600 p-2 rounded-lg border border-slate-100 line-clamp-2">
                      <span className="font-semibold text-slate-700">Note: </span>
                      {e.adminNote}
                    </div>
                  )}
                </div>

                {/* Card footer: Quick Action Buttons */}
                <div
                  className="w-full flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="text-[11px] font-medium text-slate-400 truncate max-w-[120px]">
                    {e.timing || e.area || 'Care inquiry'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {e.status === 'new' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={(ev) => handleQuickStatusChange(e, 'contacted', ev)}
                        className="px-2.5 py-1 rounded-md bg-[#EDF3FA] text-[#0E2F5A] hover:bg-[#d9e6f5] text-[11px] font-bold transition cursor-pointer"
                        title="Mark inquiry as contacted"
                      >
                        {isUpdating ? '...' : 'Mark Contacted'}
                      </button>
                    )}
                    {e.status !== 'closed' ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={(ev) => handleQuickStatusChange(e, 'closed', ev)}
                        className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                        title="Close this inquiry"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={(ev) => handleQuickStatusChange(e, 'open', ev)}
                        className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                        title="Reopen this inquiry"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
