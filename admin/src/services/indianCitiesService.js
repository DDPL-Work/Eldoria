import indianCitiesPkg from 'indian-states-cities-list';
import { DEFAULT_CITIES } from '../constants/data';

// 1. Synchronously parse static district cities from indian-states-cities-list (37 states, 739 cities - offline)
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

/**
 * Returns offline local Indian cities instantly without remote HTTP calls
 */
export async function fetchPackageCities() {
  return staticIndianCities;
}

/**
 * Combine operational cities with static district package cities
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

  // 3. Dynamic package cities (if any passed)
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
