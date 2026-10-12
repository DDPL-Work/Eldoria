import React, { useState } from 'react';
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

  const [newCityName, setNewCityName] = useState('');
  const [editingCity, setEditingCity] = useState({});

  const allCities = citiesAll();
  const liveCities = cities();
  const allBookings = bookingsAll();
  const allStaff = staffList();
  const defaultSettings = (typeof settings === 'function' ? settings() : settings) || {};

  const handleAddCity = (e) => {
    e.preventDefault();
    const name = newCityName.trim();
    if (!name) return;

    const id =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'city-' + Date.now().toString(36);

    if (allCities.some((c) => c.id === id || c.name.toLowerCase() === name.toLowerCase())) {
      onShowToast?.(`${name} is already in the cities list`);
      return;
    }

    put('cities', id, {
      name,
      order: allCities.length + 1,
      phone: '',
      whatsapp: '',
      hidden: false
    });

    setNewCityName('');
    onShowToast?.(`${name} added`);
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

  const handleStartEdit = (c) => {
    setEditingCity((prev) => ({
      ...prev,
      [c.id]: {
        name: c.name,
        phone: c.phone || '',
        whatsapp: c.whatsapp || ''
      }
    }));
  };

  const handleSaveEdit = (c, e) => {
    e.preventDefault();
    const ed = editingCity[c.id];
    if (!ed) return;

    const p = digits(ed.phone);
    const w = digits(ed.whatsapp);

    if ((ed.phone && p.length !== 10) || (ed.whatsapp && w.length !== 10)) {
      onShowToast?.('Please enter valid 10-digit phone numbers');
      return;
    }

    if (!ed.name.trim()) {
      onShowToast?.('City name cannot be empty');
      return;
    }

    put('cities', c.id, {
      ...c,
      name: ed.name.trim(),
      phone: p,
      whatsapp: w
    });

    setEditingCity((prev) => {
      const copy = { ...prev };
      delete copy[c.id];
      return copy;
    });

    onShowToast?.(`${ed.name.trim()} settings saved`);
  };

  const handleCancelEdit = (id) => {
    setEditingCity((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

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

      {/* Add City Card */}
      <form
        onSubmit={handleAddCity}
        className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-2xs space-y-2"
      >
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add a New City</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            placeholder="e.g. Nashik, Nagpur, Varanasi"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Icon name="plus" size={16} strokeWidth={2.5} />
            <span>Add city</span>
          </button>
        </div>
      </form>

      {/* City List Cards */}
      <div className="space-y-4">
        {allCities.map((c) => {
          const ed = editingCity[c.id];
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

                {!ed && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(c)}
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
                )}
              </div>

              {/* Edit Drawer for City */}
              {ed && (
                <form
                  onSubmit={(e) => handleSaveEdit(c, e)}
                  className="mt-4 pt-4 border-t border-slate-100 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City name</label>
                      <input
                        type="text"
                        required
                        value={ed.name}
                        onChange={(e) =>
                          setEditingCity({
                            ...editingCity,
                            [c.id]: { ...ed, name: e.target.value }
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dedicated Call phone
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={ed.phone}
                        onChange={(e) =>
                          setEditingCity({
                            ...editingCity,
                            [c.id]: { ...ed, phone: e.target.value }
                          })
                        }
                        placeholder="Uses global if empty"
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dedicated WhatsApp
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={ed.whatsapp}
                        onChange={(e) =>
                          setEditingCity({
                            ...editingCity,
                            [c.id]: { ...ed, whatsapp: e.target.value }
                          })
                        }
                        placeholder="Uses global if empty"
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      Save numbers
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelEdit(c.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
