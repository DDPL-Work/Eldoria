import { useState, useEffect, useRef, useMemo } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { ACTIVE, digits } from '../../constants/data';
import { DatabaseLoader } from '../common/DatabaseLoader';

export function Cities({ onShowToast }) {
  const {
    citiesAll,
    // cities,
    bookingsAll,
    staffList,
    settings,
    bCity,
    backendCities,
    citiesSummary,
    citiesLoading,
    citiesError,
    // cityActionLoading,
    fetchCities,
    createCity,
    updateCity,
    toggleCityStatus,
    deleteCity
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'live' | 'paused'
  const [cityModal, setCityModal] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const closeTimerRef = useRef(null);

  const allCities = citiesAll();
  // const liveCities = cities();
  const allBookings = bookingsAll();
  const allStaff = staffList();
  const defaultSettings = (typeof settings === 'function' ? settings() : settings) || {};

  // 1. Fetch cities from backend API on mount
  useEffect(() => {
    fetchCities().catch((err) => {
      console.warn('Backend cities fetch notice:', err);
    });
  }, [fetchCities]);

  // Keyboard navigation: Escape key closes active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (deleteModal) handleCloseDeleteModal();
        else if (cityModal) handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [cityModal, deleteModal]);

  // Combine backend cities with local store fallback
  const displayCities = useMemo(() => {
    if (backendCities && backendCities.length > 0) {
      return backendCities.map((c) => ({
        id: c.cityId || c.id,
        backendId: c.id,
        cityId: c.cityId,
        name: c.name,
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        hidden: !c.isLive,
        isLive: Boolean(c.isLive),
        order: c.order,
        notes: c.notes || '',
        stats: c.stats || null
      }));
    }
    return allCities.map((c) => ({
      ...c,
      backendId: c.backendId || c.id,
      isLive: !c.hidden,
      stats: null
    }));
  }, [backendCities, allCities]);

  // Summary counters from backend or fallback
  const summaryLive = citiesSummary?.liveCities ?? displayCities.filter((c) => !c.hidden).length;
  const summaryPaused = citiesSummary?.pausedCities ?? displayCities.filter((c) => c.hidden).length;
  const summaryTotal = citiesSummary?.totalCities ?? displayCities.length;

  // Refresh handler
  const handleRefresh = async () => {
    try {
      await fetchCities().unwrap();
      onShowToast?.('Cities refreshed from database');
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to refresh cities';
      onShowToast?.(msg);
    }
  };

  // Open modal in "add" mode
  const handleOpenAddModal = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setCityModal({
      mode: 'add',
      id: null,
      name: '',
      phone: '',
      whatsapp: '',
      error: '',
      submitting: false
    });
    setTimeout(() => {
      setModalVisible(true);
    }, 20);
  };

  // Open modal in "edit" mode
  const handleOpenEditModal = (c) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setCityModal({
      mode: 'edit',
      id: c.backendId || c.id,
      cityKey: c.id,
      name: c.name || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      error: '',
      submitting: false
    });
    setTimeout(() => {
      setModalVisible(true);
    }, 20);
  };

  // Close Add/Edit modal
  const handleCloseModal = () => {
    setModalVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setCityModal(null);
      closeTimerRef.current = null;
    }, 200);
  };

  // Open Delete confirmation modal
  const handleOpenDeleteModal = (c) => {
    setDeleteModal({
      city: c,
      error: '',
      submitting: false
    });
    setTimeout(() => {
      setDeleteVisible(true);
    }, 20);
  };

  // Close Delete confirmation modal
  const handleCloseDeleteModal = () => {
    setDeleteVisible(false);
    setTimeout(() => {
      setDeleteModal(null);
    }, 200);
  };

  // Save City (Create or Update API)
  const handleSaveCity = async (e) => {
    e.preventDefault();
    if (!cityModal || cityModal.submitting) return;

    const name = cityModal.name.trim();
    if (!name) {
      setCityModal((prev) => ({ ...prev, error: 'City name is required' }));
      return;
    }

    const p = digits(cityModal.phone);
    const w = digits(cityModal.whatsapp);

    if (cityModal.phone.trim() && p.length !== 10) {
      setCityModal((prev) => ({
        ...prev,
        error: 'Dedicated call phone must be a 10-digit mobile number'
      }));
      return;
    }

    if (cityModal.whatsapp.trim() && w.length !== 10) {
      setCityModal((prev) => ({
        ...prev,
        error: 'Dedicated WhatsApp must be a 10-digit mobile number'
      }));
      return;
    }

    setCityModal((prev) => ({ ...prev, submitting: true, error: '' }));

    try {
      if (cityModal.mode === 'add') {
        const payload = {
          name,
          phone: p,
          whatsapp: w
        };
        await createCity(payload).unwrap();
        handleCloseModal();
        onShowToast?.(`City '${name}' added successfully and is now live`);
      } else {
        const payload = {
          name,
          phone: p,
          whatsapp: w
        };
        await updateCity(cityModal.id, payload).unwrap();
        handleCloseModal();
        onShowToast?.(`City '${name}' updated successfully`);
      }
    } catch (err) {
      const errMsg = typeof err === 'string' ? err : err?.message || 'Failed to save city';
      setCityModal((prev) => ({ ...prev, error: errMsg, submitting: false }));
      onShowToast?.(errMsg);
    }
  };

  // Toggle Live/Paused status via API
  const handleToggleCity = async (c) => {
    const targetLive = c.hidden; // If currently hidden/paused, we want to activate/go live
    if (!targetLive && summaryLive <= 1) {
      onShowToast?.('Keep at least one operational live city in the system');
      return;
    }

    setTogglingId(c.id);
    try {
      const identifier = c.backendId || c.id;
      await toggleCityStatus(identifier, { isLive: targetLive }).unwrap();
      const statusLabel = targetLive ? 'now live' : 'paused';
      onShowToast?.(`${c.name} is ${statusLabel}`);
    } catch (err) {
      const errMsg = typeof err === 'string' ? err : err?.message || 'Failed to update city status';
      onShowToast?.(errMsg);
    } finally {
      setTogglingId(null);
    }
  };

  // Confirm delete via API
  const handleConfirmDelete = async () => {
    if (!deleteModal || deleteModal.submitting) return;

    const targetCity = deleteModal.city;
    setDeleteModal((prev) => ({ ...prev, submitting: true, error: '' }));

    try {
      const identifier = targetCity.backendId || targetCity.id;
      await deleteCity(identifier).unwrap();
      handleCloseDeleteModal();
      onShowToast?.(`${targetCity.name} deleted successfully`);
    } catch (err) {
      const errMsg = typeof err === 'string' ? err : err?.message || 'Failed to delete city';
      setDeleteModal((prev) => ({ ...prev, error: errMsg, submitting: false }));
      onShowToast?.(errMsg);
    }
  };

  // Filter cities by search query and status pill
  const filteredCities = useMemo(() => {
    return displayCities.filter((c) => {
      // Status pill filtering
      if (statusFilter === 'live' && c.hidden) return false;
      if (statusFilter === 'paused' && !c.hidden) return false;

      // Search query filtering
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.name?.toLowerCase().includes(q) ||
        (c.cityId && c.cityId.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsapp && c.whatsapp.includes(q))
      );
    });
  }, [displayCities, statusFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-4 sm:space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
            <Icon name="pin" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cities</h1>
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh cities from database"
                disabled={citiesLoading}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                <RiRefreshLine
                  size={18}
                  className={citiesLoading ? 'animate-spin text-amber-600' : ''}
                />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {summaryLive} live · {summaryPaused} paused · {summaryTotal} total
            </p>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/70">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({summaryTotal})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('live')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'live'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Live ({summaryLive})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paused')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'paused'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paused ({summaryPaused})
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
        Clients choose their operational city in the patient app. Each city can configure dedicated
        Care Desk Call and WhatsApp contact numbers; cities without custom numbers automatically fallback
        to global numbers in Settings. Paused cities are hidden from new bookings while preserving historic records.
      </p>

      {/* Backend Error Alert if any */}
      {citiesError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{typeof citiesError === 'string' ? citiesError : citiesError.message || 'Error syncing cities from database'}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Add City Card */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Search Cities</h2>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cities by name, slug or dedicated number (e.g. Mumbai, 9820...)"
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
          >
            <Icon name="plus" size={16} strokeWidth={2.5} />
            <span>Add city</span>
          </button>
        </div>
      </div>

      {/* City List Cards */}
      <div className="space-y-3">
        {citiesLoading ? (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <DatabaseLoader
              title="Fetching Cities from Database..."
              subtitle="Connecting to Eldoria backend server"
            />
          </div>
        ) : displayCities.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <Icon name="pin" size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No cities added yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add an operational city using the button above. You can configure dedicated Care Desk numbers directly.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Icon name="plus" size={16} strokeWidth={2.5} />
              <span>Add city</span>
            </button>
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <Icon name="search" size={22} />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No matching cities found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No cities found matching &quot;{searchQuery}&quot; with filter &quot;{statusFilter}&quot;. Try a different query or clear filters.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  <span>Clear search</span>
                </button>
              )}
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  <span>Show all statuses</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredCities.map((c) => {
            const bs = allBookings.filter((b) => bCity(b) === c.id || bCity(b) === c.cityId);
            const ss = allStaff.filter(
              (s) =>
                (s.city || '').toLowerCase() === (c.id || '').toLowerCase() ||
                (s.city || '').toLowerCase() === (c.cityId || '').toLowerCase()
            );
            const openCount = bs.filter((b) => ACTIVE.includes(b.status)).length;

            const staffCount = c.stats?.staffTotal ?? ss.length;
            const staffOnDuty = c.stats?.staffOnDuty ?? 0;
            const openBookingsCount = c.stats?.openBookings ?? openCount;
            const totalBookingsCount = c.stats?.totalBookings ?? bs.length;

            const isToggling = togglingId === c.id;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl p-4 sm:p-5 border transition ${
                  c.hidden
                    ? 'border-slate-200/90 bg-slate-50/60 opacity-80'
                    : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        c.hidden
                          ? 'bg-slate-100 border-slate-200 text-slate-500'
                          : 'bg-teal-50 border-teal-200 text-teal-800'
                      }`}
                    >
                      <Icon name="pin" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">{c.name}</span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                            c.hidden
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {c.hidden ? 'Paused' : 'Live'}
                        </span>
                        {c.cityId && (
                          <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                            /{c.cityId}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>
                          <strong className="text-slate-700 font-semibold">{staffCount}</strong> staff
                          {staffOnDuty > 0 && (
                            <span className="text-teal-700 font-semibold ml-1">
                              ({staffOnDuty} on duty)
                            </span>
                          )}
                        </span>
                        <span>·</span>
                        <span>
                          <strong className="text-slate-700 font-semibold">{openBookingsCount}</strong> open bookings
                          {totalBookingsCount > openBookingsCount && (
                            <span className="text-slate-400 ml-1">
                              ({totalBookingsCount} total)
                            </span>
                          )}
                        </span>
                        <span>·</span>
                        <span>
                          Desk:{' '}
                          {c.phone ? (
                            <span className="font-mono text-slate-800 font-semibold">
                              +91 {c.phone}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {defaultSettings.phone
                                ? `+91 ${defaultSettings.phone} (Global)`
                                : 'Not configured'}
                            </span>
                          )}
                        </span>
                        {c.whatsapp && (
                          <span className="font-mono text-emerald-700 font-semibold ml-0.5">
                            · WhatsApp +91 {c.whatsapp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {/* Edit City */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                    >
                      Edit
                    </button>

                    {/* Toggle Status (Pause / Go Live) */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleCity(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        c.hidden
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      } ${isToggling ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {isToggling && <RiRefreshLine className="animate-spin text-xs" />}
                      <span>{c.hidden ? 'Go live' : 'Pause'}</span>
                    </button>

                    {/* Delete City */}
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(c)}
                      title={`Delete ${c.name}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit City Modal */}
      {cityModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="city-modal-title"
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 ease-out ${
            modalVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleCloseModal}
        >
          <div
            className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all duration-200 ease-out ${
              modalVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-2.5'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    cityModal.mode === 'edit'
                      ? 'bg-teal-50 border-teal-200 text-teal-800'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-600'
                  }`}
                >
                  <Icon
                    name={cityModal.mode === 'edit' ? 'edit' : 'pin'}
                    size={19}
                    strokeWidth={2.3}
                  />
                </div>
                <div>
                  <h2 id="city-modal-title" className="text-base font-bold text-slate-900 tracking-tight">
                    {cityModal.mode === 'edit' ? 'Edit City' : 'Add New City'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {cityModal.mode === 'edit'
                      ? 'Update operational city and dedicated Care Desk contact numbers'
                      : 'Configure operational city and dedicated Care Desk contact numbers'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Close modal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <span className="text-base font-bold leading-none">✕</span>
              </button>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleSaveCity} className="p-6 space-y-4">
              {cityModal.error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <span className="shrink-0 text-sm">⚠️</span>
                  <span>{cityModal.error}</span>
                </div>
              )}

              {/* City Name */}
              <div>
                <label htmlFor="city-modal-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                  City name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Icon name="pin" size={16} />
                  </div>
                  <input
                    id="city-modal-name"
                    type="text"
                    required
                    autoFocus
                    value={cityModal.name}
                    onChange={(e) => setCityModal({ ...cityModal, name: e.target.value, error: '' })}
                    placeholder="e.g. Nashik, Nagpur, Varanasi"
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Dedicated Call Phone & Dedicated WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city-modal-phone" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Icon name="phone" size={14} className="text-slate-500" />
                    <span>Dedicated Call phone</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 overflow-hidden bg-white transition">
                    <span className="inline-flex items-center px-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                      +91
                    </span>
                    <input
                      id="city-modal-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={cityModal.phone}
                      onChange={(e) => setCityModal({ ...cityModal, phone: e.target.value, error: '' })}
                      placeholder={defaultSettings.phone || '10-digit number'}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {defaultSettings.phone
                      ? `Fallback: +91 ${defaultSettings.phone}`
                      : 'Uses global if empty'}
                  </p>
                </div>

                <div>
                  <label htmlFor="city-modal-wa" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Icon name="wa" size={14} className="text-emerald-600" />
                    <span>Dedicated WhatsApp</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 overflow-hidden bg-white transition">
                    <span className="inline-flex items-center px-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                      +91
                    </span>
                    <input
                      id="city-modal-wa"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={cityModal.whatsapp}
                      onChange={(e) => setCityModal({ ...cityModal, whatsapp: e.target.value, error: '' })}
                      placeholder={defaultSettings.whatsapp || '10-digit number'}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {defaultSettings.whatsapp
                      ? `Fallback: +91 ${defaultSettings.whatsapp}`
                      : 'Uses global if empty'}
                  </p>
                </div>
              </div>

              {/* Informational tip matching Eldoria Care Desk */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
                <Icon name="help" size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Cities without custom numbers automatically fallback to the global number configured in Settings.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={cityModal.submitting}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cityModal.submitting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {cityModal.submitting ? (
                    <RiRefreshLine className="animate-spin text-sm" />
                  ) : (
                    <Icon name={cityModal.mode === 'edit' ? 'check' : 'plus'} size={15} strokeWidth={2.5} />
                  )}
                  <span>
                    {cityModal.submitting
                      ? 'Saving...'
                      : cityModal.mode === 'edit'
                      ? 'Save edit'
                      : 'Save details'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete City Confirmation Modal */}
      {deleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-city-modal-title"
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 ease-out ${
            deleteVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleCloseDeleteModal}
        >
          <div
            className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all duration-200 ease-out ${
              deleteVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-2.5'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Icon name="trash" size={22} />
                </div>
                <div>
                  <h3 id="delete-city-modal-title" className="text-base font-bold text-slate-900">
                    Delete City
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This action will remove the city from active operations.
                  </p>
                </div>
              </div>

              {deleteModal.error ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                  <span className="shrink-0 text-sm mt-0.5">⚠️</span>
                  <span>{deleteModal.error}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900 font-bold">{deleteModal.city.name}</strong>?
                  <br />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Note: Backend safety guards prevent deleting cities that have existing bookings or registered staff.
                  </span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={deleteModal.submitting}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteModal.submitting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {deleteModal.submitting ? (
                    <RiRefreshLine className="animate-spin text-sm" />
                  ) : (
                    <Icon name="trash" size={15} />
                  )}
                  <span>{deleteModal.submitting ? 'Deleting...' : 'Delete City'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cities;
