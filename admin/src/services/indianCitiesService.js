import { GetState, GetCity } from 'react-country-state-city';
import indianCitiesPkg from 'indian-states-cities-list';
import { DEFAULT_CITIES } from '../constants/data';

// 1. Synchronously parse static district cities from indian-states-cities-list
const { STATE_WISE_CITIES } = indianCitiesPkg || {};
export const staticIndianCities = [];

if (STATE_WISE_CITIES) {
  Object.entries(STATE_WISE_CITIES).forEach(([stateRaw, list]) => {
    const state = stateRaw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    if (Array.isArray(list)) {
      list.forEach((item) => {
        const name = typeof item === 'string' ? item : item?.label || item?.value;
        if (name && typeof name === 'string') {
          const trimmed = name.trim();
          const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          staticIndianCities.push({ id, name: trimmed, state });
        }
      });
    }
  });
}

// Global in-memory cache so we only load from react-country-state-city once
let cachedApiCities = null;
let loadingPromise = null;

export async function fetchPackageCities() {
  if (cachedApiCities) return cachedApiCities;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const states = await GetState(101); // Country ID 101 = India
      if (!Array.isArray(states)) {
        cachedApiCities = [];
        return cachedApiCities;
      }

      const majorStateNames = [
        'Maharashtra',
        'Delhi',
        'Karnataka',
        'Tamil Nadu',
        'Gujarat',
        'Rajasthan',
        'Uttar Pradesh',
        'West Bengal',
        'Telangana',
        'Kerala',
        'Punjab',
        'Madhya Pradesh',
        'Goa',
        'Uttarakhand',
        'Haryana',
        'Bihar',
        'Odisha',
        'Assam',
        'Jharkhand',
        'Chhattisgarh',
        'Himachal Pradesh'
      ];

      const targetStates = states.filter((s) =>
        majorStateNames.some((m) => m.toLowerCase() === s.name?.toLowerCase())
      );

      const loaded = [];
      for (const st of targetStates) {
        try {
          const cities = await GetCity(101, st.id);
          if (Array.isArray(cities)) {
            cities.forEach((ct) => {
              if (ct?.name) {
                const name = ct.name.trim();
                const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                loaded.push({ id, name, state: st.name });
              }
            });
          }
        } catch {
          // Ignore individual state error
        }
      }

      cachedApiCities = loaded;
      return cachedApiCities;
    } catch (err) {
      console.warn('Could not load react-country-state-city data, using static fallback:', err);
      cachedApiCities = [];
      return cachedApiCities;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Combine operational cities with static package cities and dynamic package cities
 */
export function buildMergedCities({ storeCities = [], backendCities = [], dynamicCities = [] }) {
  const map = new Map();

  // 1. Default operational cities first (exact list from reference index (4).html)
  DEFAULT_CITIES.forEach((c) => {
    map.set(c.id, { id: c.id, name: c.name, state: 'Operational Hub', isPopular: true });
  });

  // 2. Database & Store operational cities
  if (Array.isArray(storeCities)) {
    storeCities.forEach((c) => {
      if (c && c.id && c.name && !map.has(c.id)) {
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

  // 3. Dynamic package cities (react-country-state-city)
  if (Array.isArray(dynamicCities)) {
    dynamicCities.forEach((c) => {
      if (c && c.id && !map.has(c.id)) {
        map.set(c.id, c);
      }
    });
  }

  // 4. Static district package cities (indian-states-cities-list)
  staticIndianCities.forEach((c) => {
    if (c && c.id && !map.has(c.id)) {
      map.set(c.id, c);
    }
  });

  return Array.from(map.values());
}
