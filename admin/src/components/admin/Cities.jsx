import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { DEFAULT_CITIES, ACTIVE, digits } from '../../constants/data';

export function Cities({ onShowToast }) {
  const {
    citiesAll,
    cities,
    bookingsAll,
    staffList,
    settings,
    put,
    bCity
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [cityModal, setCityModal] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const closeTimerRef = useRef(null);

  const allCities = citiesAll();
  const liveCities = cities();
  const allBookings = bookingsAll();
  const allStaff = staffList();
  const defaultSettings = (typeof settings === 'function' ? settings() : settings) || {};

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && cityModal) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [cityModal]);

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
      error: ''
    });
    setTimeout(() => {
      setModalVisible(true);
    }, 20);
  };

  const handleOpenEditModal = (c) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setCityModal({
      mode: 'edit',
      id: c.id,
      name: c.name || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      error: ''
    });
    setTimeout(() => {
      setModalVisible(true);
    }, 20);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setCityModal(null);
      closeTimerRef.current = null;
    }, 200);
  };

  const handleSaveCity = (e) => {
    e.preventDefault();
    if (!cityModal) return;

    const name = cityModal.name.trim();
    if (!name) {
      setCityModal((prev) => ({ ...prev, error: 'City name is required' }));
      return;
    }

    const p = digits(cityModal.phone);
    const w = digits(cityModal.whatsapp);

    if (cityModal.phone.trim() && p.length !== 10) {
      setCityModal((prev) => ({ ...prev, error: 'Dedicated call phone must be a 10-digit number' }));
      return;
    }

    if (cityModal.whatsapp.trim() && w.length !== 10) {
      setCityModal((prev) => ({ ...prev, error: 'Dedicated WhatsApp must be a 10-digit number' }));
      return;
    }

    if (cityModal.mode === 'add') {
      const id =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'city-' + Date.now().toString(36);

      if (allCities.some((c) => c.id === id || c.name.toLowerCase() === name.toLowerCase())) {
        const msg = `${name} is already in the cities list`;
        setCityModal((prev) => ({ ...prev, error: msg }));
        onShowToast?.(msg);
        return;
      }

      put('cities', id, {
        id,
        name,
        order: allCities.length + 1,
        phone: p,
        whatsapp: w,
        hidden: false
      });

      handleCloseModal();
      onShowToast?.(`${name} added successfully`);
    } else {
      // Edit mode
      const existing = allCities.find((c) => c.id === cityModal.id);
      if (
        allCities.some(
          (c) => c.id !== cityModal.id && c.name.toLowerCase() === name.toLowerCase()
        )
      ) {
        const msg = `Another city with the name "${name}" already exists`;
        setCityModal((prev) => ({ ...prev, error: msg }));
        onShowToast?.(msg);
        return;
      }

      put('cities', cityModal.id, {
        ...(existing || {}),
        id: cityModal.id,
        name,
        phone: p,
        whatsapp: w
      });

      handleCloseModal();
      onShowToast?.(`${name} updated successfully`);
    }
  };

  const handleToggleCity = (c) => {
    if (!c.hidden && liveCities.length <= 1) {
      onShowToast?.('Keep at least one operational live city');
      return;
    }

    put('cities', c.id, {
      ...c,
      hidden: !c.hidden
    });

    onShowToast?.(`${c.name} is ${c.hidden ? 'now live' : 'paused'}`);
  };

  // Filter cities by search query
  const filteredCities = allCities.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name?.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.whatsapp && c.whatsapp.includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-4 sm:space-y-3.5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cities</h1>
        <span className="text-xs text-slate-500 font-medium">
          {liveCities.length} live · {allCities.length - liveCities.length} paused
        </span>
      </div>

      <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
        Clients choose their city in the app. Each city can configure dedicated Care Desk Call and
        WhatsApp numbers; cities without custom numbers automatically fallback to the global number in
        Settings. Paused cities are hidden from new client app bookings but preserve all past
        records.
      </p>

      {/* Search & Add City Card */}
      <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-2xs space-y-2">
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
              placeholder="Search cities by name or number (e.g. Nashik, 9820...)"
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
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
      <div className="space-y-4">
        {allCities.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center text-slate-400 border border-slate-200/80 space-y-3">
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
          <div className="bg-white rounded-lg p-12 text-center text-slate-400 border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <Icon name="search" size={22} />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No matching cities found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No cities found matching &quot;{searchQuery}&quot;. Try a different name or clear search.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              <span>Clear search</span>
            </button>
          </div>
        ) : (
          filteredCities.map((c) => {
            const bs = allBookings.filter((b) => bCity(b) === c.id);
            const ss = allStaff.filter((s) => (s.city || DEFAULT_CITIES[0].id) === c.id);
            const openCount = bs.filter((b) => ACTIVE.includes(b.status)).length;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-lg p-5 border transition ${
                  c.hidden ? 'border-slate-200 bg-slate-50/50 opacity-75' : 'border-slate-200/80 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                      <Icon name="pin" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
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
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {ss.length} staff · {openCount} open bookings · Desk:{' '}
                        {c.phone ? (
                          <span className="font-mono text-slate-700 font-semibold">+91 {c.phone}</span>
                        ) : (
                          <span className="text-slate-400">
                            {defaultSettings.phone ? 'Global default' : 'Not configured'}
                          </span>
                        )}
                        {c.whatsapp && (
                          <span className="font-mono text-emerald-700 ml-1">
                            · WhatsApp +91 {c.whatsapp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCity(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        c.hidden
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {c.hidden ? 'Go live' : 'Pause'}
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
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Icon name={cityModal.mode === 'edit' ? 'check' : 'plus'} size={15} strokeWidth={2.5} />
                  <span>{cityModal.mode === 'edit' ? 'Save edit' : 'Save details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
