import React, { createContext, useContext, useState, useEffect } from 'react';
import { demoData, DEFAULT_CITIES, starterCatalog } from '../constants/data';

const StoreContext = createContext(null);
const STORE_KEY = 'eldoria:data:v5';

export function StoreProvider({ children }) {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.bookings && Object.keys(parsed.bookings).length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    const initial = demoData();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(initial));
    } catch (e) {}
    return initial;
  });

  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('eldoria:adminCity') || 'all';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [data]);

  useEffect(() => {
    localStorage.setItem('eldoria:adminCity', selectedCity);
  }, [selectedCity]);

  // Sync with other tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORE_KEY && e.newValue) {
        try {
          setData(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const put = (col, id, doc) => {
    setData((prev) => ({
      ...prev,
      [col]: {
        ...(prev[col] || {}),
        [id]: { ...doc, id }
      }
    }));
  };

  const patch = (col, id, doc) => {
    setData((prev) => {
      const cur = prev[col]?.[id] || {};
      return {
        ...prev,
        [col]: {
          ...(prev[col] || {}),
          [id]: { ...cur, ...doc, id }
        }
      };
    });
  };

  const remove = (col, id) => {
    setData((prev) => {
      const copy = { ...(prev[col] || {}) };
      delete copy[id];
      return {
        ...prev,
        [col]: copy
      };
    });
  };

  const notify = (to, title, body, bookingId, extra = {}) => {
    const id = 'n' + Date.now().toString(36);
    put('notifications', id, {
      to,
      title,
      body,
      bookingId: bookingId || '',
      at: Date.now(),
      read: false,
      ...extra
    });
  };

  const setStatus = (b, status, extra = {}, by = 'admin') => {
    const hist = (b.history || []).concat([{ status, at: Date.now(), by: by || 'admin' }]);
    patch('bookings', b.id, {
      status,
      history: hist,
      updatedAt: Date.now(),
      ...extra
    });
  };

  const assign = (bid, sid, by = 'admin') => {
    const b = data.bookings[bid];
    const st = data.staff[sid];
    if (!b || !st) return false;
    const s = svcB(b);
    const prev = b.staffId && b.staffId !== sid ? b.staffId : '';
    const tasks = b.tasks && b.tasks.length ? b.tasks : (s.tasks || []).map((l) => ({ label: l, done: false }));
    const now = Date.now();
    const hist = (b.history || []).slice();
    const extra = {};
    if (!hist.find((h) => h.status === 'confirmed')) {
      hist.push({ status: 'confirmed', at: now, by });
      extra.confirmedBy = by;
      extra.confirmedAt = now;
    }
    hist.push({ status: 'assigned', at: now, by, staffId: sid });

    patch('bookings', bid, {
      staffId: sid,
      status: 'assigned',
      history: hist,
      tasks,
      assignedBy: by,
      assignedAt: now,
      updatedAt: now,
      ...extra
    });

    notify(
      'admin',
      `${b.code} assigned by staff`,
      `${st.name} assigned to ${b.patientName}'s ${s.name} visit in ${cityName(b.city)}`,
      bid
    );
    notify(
      'staff:' + sid,
      'New visit assigned',
      `${b.patientName} · ${s.name} · ${b.address}`,
      bid
    );
    if (prev) {
      notify('staff:' + prev, 'Visit reassigned', `${b.patientName} has been reassigned to ${st.name}.`, bid);
    }
    return true;
  };

  const unassign = (bid) => {
    const b = data.bookings[bid];
    if (!b || !b.staffId) return;
    const old = b.staffId;
    setStatus(b, 'confirmed', { staffId: '', assignedBy: '', assignedAt: 0 }, 'admin');
    notify('staff:' + old, 'Visit removed', `${b.patientName} is no longer assigned to you.`, bid);
  };

  const loadDemoData = () => {
    const d = demoData();
    setData(d);
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
  };

  const resetAllData = () => {
    const empty = {
      categories: {},
      services: {},
      bookings: {},
      staff: {},
      notifications: {},
      cities: {},
      enquiries: {},
      settings: { app: { id: 'app', phone: '9820012345', whatsapp: '9820012345', staffCanConfirm: true } }
    };
    setData(empty);
    localStorage.setItem(STORE_KEY, JSON.stringify(empty));
  };

  // Helper queries
  const byOrder = (a, b) => (a.order || 999) - (b.order || 999) || String(a.name).localeCompare(String(b.name));
  const catsAll = () => Object.values(data.categories || {}).filter((c) => c.name).sort(byOrder);
  const catOf = (id) => data.categories?.[id] || { name: 'Other', icon: 'cross', kind: 'care' };
  const svcAll = () => Object.values(data.services || {}).filter((x) => x.name).sort(byOrder);
  const svcLive = (x) => x.enabled !== false && catOf(x.categoryId).enabled !== false;
  const svcBookable = (x) => svcLive(x) && !catOf(x.categoryId).comingSoon;
  const services = () => catsAll().flatMap((c) => svcAll().filter((x) => x.categoryId === c.id && svcBookable(x)));
  const svcInCat = (cid, all = true) => svcAll().filter((x) => x.categoryId === cid && (all || svcLive(x)));
  const svc = (id) => data.services?.[id] || { id, name: 'Service', tasks: [], options: [], icon: 'cross' };
  const svcB = (b) => (data.services?.[b?.service] ? data.services[b.service] : { id: b?.service, name: b?.serviceName || 'Service', tasks: [], options: [], icon: 'cross' });

  const citiesAll = () => {
    const saved = data.cities || {};
    return DEFAULT_CITIES.map((c) => ({ ...c, ...(saved[c.id] || {}) }))
      .concat(Object.values(saved).filter((c) => !DEFAULT_CITIES.find((d) => d.id === c.id)))
      .sort((a, b) => (a.order || 99) - (b.order || 99));
  };
  const cities = () => citiesAll().filter((c) => !c.hidden);
  const cityName = (id) => (citiesAll().find((c) => c.id === id) || { name: id || '—' }).name;

  const bookingsAll = () => Object.values(data.bookings || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const inCity = (list, key = (x) => x?.city || DEFAULT_CITIES[0].id) => {
    if (!list) return [];
    if (selectedCity === 'all') return list;
    return list.filter((item) => key(item) === selectedCity);
  };
  const filterByCity = inCity;
  const sCity = (s) => s?.city || DEFAULT_CITIES[0].id;
  const bCity = (b) => b?.city || DEFAULT_CITIES[0].id;
  const apprOf = (a) => a?.approval || (a?.applied ? 'pending' : 'approved');
  const staffCanConfirm = () => (data.settings?.app?.staffCanConfirm !== false);

  const staffList = () =>
    Object.values(data.staff || {})
      .filter((s) => (s.approval || 'approved') === 'approved')
      .sort((a, b) => a.name.localeCompare(b.name));

  const applications = () =>
    Object.values(data.staff || {})
      .filter((s) => s.applied)
      .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  const enqAll = () => Object.values(data.enquiries || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const notesFor = (to = 'admin') => Object.values(data.notifications || {}).filter((n) => n.to === to).sort((a, b) => b.at - a.at);
  const unread = (to = 'admin') => notesFor(to).filter((n) => !n.read).length;
  const settings = () => data.settings?.app || {};

  return (
    <StoreContext.Provider
      value={{
        data,
        put,
        patch,
        remove,
        notify,
        setStatus,
        assign,
        unassign,
        loadDemoData,
        resetAllData,
        selectedCity,
        setSelectedCity,
        // Selectors
        catsAll,
        catOf,
        svcAll,
        svcLive,
        svcBookable,
        services,
        svcInCat,
        svc,
        svcB,
        citiesAll,
        cities,
        cityName,
        bookingsAll,
        filterByCity,
        inCity,
        sCity,
        bCity,
        apprOf,
        staffCanConfirm,
        staffList,
        applications,
        enqAll,
        notesFor,
        unread,
        settings
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
