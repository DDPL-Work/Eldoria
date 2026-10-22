import React, { useState, useRef, useEffect, useMemo } from 'react';
import indianCitiesPkg from 'indian-states-cities-list';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { DEFAULT_CITIES } from '../../constants/data';

// Extract instant district cities from local package (37 states, 739 cities - 0 network calls)
const { STATE_WISE_CITIES } = indianCitiesPkg || {};
const staticIndianCities = [];
if (STATE_WISE_CITIES) {
  Object.entries(STATE_WISE_CITIES).forEach(([stateRaw, list]) => {
    const state = stateRaw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    if (Array.isArray(list)) {
      list.forEach((item) => {
        const name = typeof item === 'string' ? item : item?.label || item?.value;
        if (name) {
          const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
          staticIndianCities.push({ id, name, state });
        }
      });
    }
  });
}

export function CityDropdown({ className = '' }) {
  const { selectedCity, setSelectedCity, cityName, cities, backendCities } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Merge operational default cities + local district cities
  const allCitiesList = useMemo(() => {
    const map = new Map();

    // 1. Database & Store operational cities first
    const storeCities = typeof cities === 'function' ? cities() : [];
    if (Array.isArray(storeCities)) {
      storeCities.forEach((c) => {
        if (c && c.id && c.name) {
          map.set(c.id, { id: c.id, name: c.name, state: 'Operational City', isPopular: true });
        }
      });
    }

    if (Array.isArray(backendCities)) {
      backendCities.forEach((c) => {
        const id = c.slug || c.id;
        if (id && c.name && !map.has(id)) {
          map.set(id, { id, name: c.name, state: 'Operational City', isPopular: true });
        }
      });
    }

    // 2. Operational default cities
    DEFAULT_CITIES.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, { id: c.id, name: c.name, state: 'Operational Hub', isPopular: true });
      }
    });

    // 3. Add static district cities (739 Indian cities from local package)
    staticIndianCities.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, c);
      }
    });

    return Array.from(map.values());
  }, [cities, backendCities]);

  // Filter cities by search term
  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCitiesList;
    return allCitiesList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        c.id.includes(q)
    );
  }, [allCitiesList, search]);

  // Current display label
  const displayLabel = useMemo(() => {
    if (selectedCity === 'all') return 'All cities';
    const found = allCitiesList.find((c) => c.id === selectedCity);
    if (found) return found.name;
    const fromStore = cityName(selectedCity);
    if (fromStore && fromStore !== '—') return fromStore;
    return selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1);
  }, [selectedCity, allCitiesList, cityName]);

  const handleSelect = (cityId) => {
    setSelectedCity(cityId);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* City Trigger Button matching exact design */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-1.5 shadow-2xs transition cursor-pointer select-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon name="pin" size={15} className="text-slate-500" />
        <span className="text-slate-500 text-xs sm:text-sm font-medium">City</span>
        <span className="text-slate-900 text-xs sm:text-sm font-bold ml-0.5 truncate max-w-[130px]">
          {displayLabel}
        </span>
        <Icon name="down" size={13} className="text-slate-500 ml-1" />
      </button>

      {/* Dropdown Menu with Search and City List */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden flex flex-col">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 sticky top-0 z-10">
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-slate-400">
                <Icon name="search" size={13} />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Indian city..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* City Options List */}
          <div className="max-h-64 overflow-y-auto thin-scrollbar divide-y divide-slate-50 text-xs">
            {/* 1. All Cities Option */}
            {!search && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full text-left px-3.5 py-2 transition cursor-pointer flex items-center justify-between ${
                  selectedCity === 'all'
                    ? 'bg-[#E4ECF7] text-[#0E2F5A] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌐</span>
                  <span>All cities</span>
                </div>
                {selectedCity === 'all' && (
                  <span className="text-[#0E2F5A] font-bold">✓</span>
                )}
              </button>
            )}

            {/* Empty state */}
            {filteredCities.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600 text-xs">No city found</p>
                <p className="text-[11px] text-slate-400">Try searching another spelling</p>
              </div>
            ) : (
              filteredCities.map((c) => {
                const isSelected = selectedCity === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`w-full text-left px-3.5 py-2 transition cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#E4ECF7] text-[#0E2F5A] font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-medium text-slate-800 group-hover:text-slate-900">
                        {c.name}
                      </div>
                      {c.state && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {c.state}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[#0E2F5A] font-bold text-sm shrink-0">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer showing count */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>{filteredCities.length} Indian cities available</span>
            <span className="text-[#0E2F5A] font-semibold">India</span>
          </div>
        </div>
      )}
    </div>
  );
}
