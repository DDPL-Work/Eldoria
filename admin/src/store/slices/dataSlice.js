import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminAPI, bookingAPI, cityAPI } from '../../services/api';
import { demoData } from '../../constants/data';

// Purge any previously stored data from localStorage so nothing persists locally
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('eldoria:data:v5');
    window.localStorage.removeItem('eldoria:data:v1');
    window.localStorage.removeItem('eldoria:adminCity');
  }
} catch (e) {
  // Ignore in SSR / testing environments
}

const getInitialData = () => {
  try {
    const d = demoData();
    return {
      ...d,
      bookings: {}, // Strict: no fake/demo bookings in state
      staff: {}, // Strict: no fake/demo staff in state
      cities: {}, // Strict: no fake/demo cities in state
    };
  } catch {
    return {
      categories: {},
      services: {},
      bookings: {},
      staff: {},
      notifications: {},
      cities: {},
      enquiries: {},
      settings: {
        app: {
          id: 'app',
          phone: '',
          whatsapp: '',
          staffCanConfirm: true,
        },
      },
    };
  }
};

const getInitialCity = () => {
  return 'all';
};

/**
 * Async Thunk: Fetch Staff Registration Requests from Backend API
 */
export const fetchStaffRequestsThunk = createAsyncThunk(
  'data/fetchStaffRequests',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await adminAPI.getStaffRequests(params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch staff requests');
    }
  }
);

/**
 * Async Thunk: Approve Staff Request on Backend API
 */
export const approveStaffThunk = createAsyncThunk(
  'data/approveStaff',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await adminAPI.approveStaffRequest(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to approve staff');
    }
  }
);

/**
 * Async Thunk: Reject Staff Request on Backend API
 */
export const rejectStaffThunk = createAsyncThunk('data/rejectStaff',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await adminAPI.rejectStaffRequest(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to reject staff');
    }
  }
);

/**
 * Async Thunk: Fetch Clients from Backend API
 */
export const fetchClientsThunk = createAsyncThunk('data/fetchClients',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await adminAPI.getClients(params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch clients');
    }
  }
);

/**
 * Async Thunk: Fetch Dashboard Metrics & Data from Backend API
 */
export const fetchDashboardThunk = createAsyncThunk('data/fetchDashboard',
  async (city = 'all', { rejectWithValue }) => {
    try {
      const res = await adminAPI.getDashboardData({ city: city || 'all' });
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch dashboard data');
    }
  }
);

/**
 * Async Thunk: Fetch Bookings List from Backend API
 */
export const fetchBookingsThunk = createAsyncThunk('data/fetchBookings',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await bookingAPI.getBookings(params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch bookings');
    }
  }
);

/**
 * Async Thunk: Fetch Single Booking Details by ID or Code from Backend API
 */
export const fetchBookingByIdThunk = createAsyncThunk('data/fetchBookingById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await bookingAPI.getBookingById(id);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch booking details');
    }
  }
);

/**
 * Async Thunks: City Management CRUD
 */
export const fetchCitiesThunk = createAsyncThunk(
  'data/fetchCities',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await cityAPI.getCities(params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch cities');
    }
  }
);

export const getCityByIdThunk = createAsyncThunk(
  'data/getCityById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cityAPI.getCityById(id);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch city details');
    }
  }
);

export const createCityThunk = createAsyncThunk(
  'data/createCity',
  async (cityData, { rejectWithValue }) => {
    try {
      const res = await cityAPI.createCity(cityData);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create city');
    }
  }
);

export const updateCityThunk = createAsyncThunk(
  'data/updateCity',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await cityAPI.updateCity(id, data);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update city settings');
    }
  }
);

export const toggleCityStatusThunk = createAsyncThunk(
  'data/toggleCityStatus',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await cityAPI.toggleCityStatus(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update city status');
    }
  }
);

export const deleteCityThunk = createAsyncThunk(
  'data/deleteCity',
  async (id, { rejectWithValue }) => {
    try {
      const res = await cityAPI.deleteCity(id);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete city');
    }
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    data: getInitialData(),
    selectedCity: getInitialCity(),
    dashboardData: null,
    dashboardLoading: false,
    dashboardError: null,
    backendStaffRequests: [],
    backendClients: [],
    backendBookings: [],
    bookingsPagination: null,
    bookingsLoading: false,
    bookingsError: null,
    currentBookingDetail: null,
    bookingDetailLoading: false,
    bookingDetailError: null,
    backendCities: [],
    citiesSummary: null,
    citiesLoading: false,
    citiesError: null,
    cityActionLoading: false,
    cityActionError: null,
    loading: false,
    error: null,
  },
  reducers: {
    put: (state, action) => {
      const { col, id, doc } = action.payload;
      if (!state.data[col]) state.data[col] = {};
      state.data[col][id] = { ...doc, id };
    },
    patch: (state, action) => {
      const { col, id, doc } = action.payload;
      if (!state.data[col]) state.data[col] = {};
      const cur = state.data[col][id] || {};
      state.data[col][id] = { ...cur, ...doc, id };
    },
    remove: (state, action) => {
      const { col, id } = action.payload;
      if (state.data[col]) {
        delete state.data[col][id];
      }
    },
    notify: (state, action) => {
      const { to, title, body, bookingId = '', extra = {} } = action.payload;
      const id = 'n' + Date.now().toString(36);
      if (!state.data.notifications) state.data.notifications = {};
      state.data.notifications[id] = {
        to,
        title,
        body,
        bookingId,
        at: Date.now(),
        read: false,
        id,
        ...extra,
      };
    },
    setStatus: (state, action) => {
      const { bookingId, status, extra = {}, by = 'admin' } = action.payload;
      const b = state.data.bookings?.[bookingId];
      if (!b) return;
      const hist = (b.history || []).concat([{ status, at: Date.now(), by: by || 'admin' }]);
      state.data.bookings[bookingId] = {
        ...b,
        status,
        history: hist,
        updatedAt: Date.now(),
        ...extra,
      };
    },
    assign: (state, action) => {
      const { bid, sid, by = 'admin' } = action.payload;
      const b = state.data.bookings?.[bid];
      const st = state.data.staff?.[sid];
      if (!b || !st) return;

      const s = state.data.services?.[b.service] || { name: 'Service', tasks: [] };
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

      state.data.bookings[bid] = {
        ...b,
        staffId: sid,
        status: 'assigned',
        history: hist,
        tasks,
        assignedBy: by,
        assignedAt: now,
        updatedAt: now,
        ...extra,
      };

      if (!state.data.notifications) state.data.notifications = {};
      const nIdAdmin = 'n' + Date.now().toString(36);
      state.data.notifications[nIdAdmin] = {
        id: nIdAdmin,
        to: 'admin',
        title: `${b.code} assigned by staff`,
        body: `${st.name} assigned to ${b.patientName}'s ${s.name} visit`,
        bookingId: bid,
        at: now,
        read: false,
      };

      const nIdStaff = 'n' + (Date.now() + 1).toString(36);
      state.data.notifications[nIdStaff] = {
        id: nIdStaff,
        to: 'staff:' + sid,
        title: 'New visit assigned',
        body: `${b.patientName} · ${s.name} · ${b.address}`,
        bookingId: bid,
        at: now,
        read: false,
      };

      if (prev) {
        const nIdPrev = 'n' + (Date.now() + 2).toString(36);
        state.data.notifications[nIdPrev] = {
          id: nIdPrev,
          to: 'staff:' + prev,
          title: 'Visit reassigned',
          body: `${b.patientName} has been reassigned to ${st.name}.`,
          bookingId: bid,
          at: now,
          read: false,
        };
      }
    },
    unassign: (state, action) => {
      const { bid } = action.payload;
      const b = state.data.bookings?.[bid];
      if (!b || !b.staffId) return;
      const old = b.staffId;
      const hist = (b.history || []).concat([{ status: 'confirmed', at: Date.now(), by: 'admin' }]);

      state.data.bookings[bid] = {
        ...b,
        status: 'confirmed',
        staffId: '',
        assignedBy: '',
        assignedAt: 0,
        history: hist,
        updatedAt: Date.now(),
      };

      if (!state.data.notifications) state.data.notifications = {};
      const nId = 'n' + Date.now().toString(36);
      state.data.notifications[nId] = {
        id: nId,
        to: 'staff:' + old,
        title: 'Visit removed',
        body: `${b.patientName} is no longer assigned to you.`,
        bookingId: bid,
        at: Date.now(),
        read: false,
      };
    },
    setSelectedCity: (state, action) => {
      state.selectedCity = action.payload;
    },
    loadDemoData: (state) => {
      state.data = getInitialData();
    },
    resetAllData: (state) => {
      const empty = {
        categories: {},
        services: {},
        bookings: {},
        staff: {},
        notifications: {},
        cities: {},
        enquiries: {},
        settings: { app: { id: 'app', phone: '9820012345', whatsapp: '9820012345', staffCanConfirm: true } },
      };
      state.data = empty;
    },
    syncExternalData: (state, action) => {
      if (action.payload) {
        state.data = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchStaffRequests
      .addCase(fetchStaffRequestsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffRequestsThunk.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.requests)
          ? payload.requests
          : Array.isArray(payload?.data?.requests)
          ? payload.data.requests
          : [];
        state.backendStaffRequests = list;
        state.staffRequestsPagination =
          payload?.pagination || payload?.data?.pagination || null;
      })
      .addCase(fetchStaffRequestsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // approveStaff
      .addCase(approveStaffThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        if (id) {
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === String(id) || String(item.staffId) === String(id)
              ? { ...item, approval: 'approved', docs: 'verified' }
              : item
          );
        }
      })
      // rejectStaff
      .addCase(rejectStaffThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        if (id) {
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === String(id) || String(item.staffId) === String(id)
              ? { ...item, approval: 'rejected' }
              : item
          );
        }
      })
      // fetchClients
      .addCase(fetchClientsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientsThunk.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.clients)
          ? payload.clients
          : Array.isArray(payload?.data?.clients)
          ? payload.data.clients
          : [];
        state.backendClients = list;
        state.clientsPagination =
          payload?.pagination || payload?.data?.pagination || null;
      })
      .addCase(fetchClientsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchDashboard
      .addCase(fetchDashboardThunk.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchDashboardThunk.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        const payload = action.payload;
        state.dashboardData = payload?.data || payload;
      })
      .addCase(fetchDashboardThunk.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      })
      // fetchBookings
      .addCase(fetchBookingsThunk.pending, (state) => {
        state.bookingsLoading = true;
        state.bookingsError = null;
      })
      .addCase(fetchBookingsThunk.fulfilled, (state, action) => {
        state.bookingsLoading = false;
        const payload = action.payload;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.bookings)
          ? payload.bookings
          : Array.isArray(payload?.data?.bookings)
          ? payload.data.bookings
          : [];
        state.backendBookings = list;
        state.bookingsPagination =
          payload?.pagination || payload?.data?.pagination || null;

        // Cache into state.data.bookings for universal access
        if (!state.data.bookings) state.data.bookings = {};
        list.forEach((b) => {
          if (b && (b.id || b.code)) {
            const key = b.id || b.code;
            state.data.bookings[key] = {
              ...(state.data.bookings[key] || {}),
              ...b,
            };
          }
        });
      })
      .addCase(fetchBookingsThunk.rejected, (state, action) => {
        state.bookingsLoading = false;
        state.bookingsError = action.payload;
      })
      // fetchBookingById
      .addCase(fetchBookingByIdThunk.pending, (state) => {
        state.bookingDetailLoading = true;
        state.bookingDetailError = null;
      })
      .addCase(fetchBookingByIdThunk.fulfilled, (state, action) => {
        state.bookingDetailLoading = false;
        const booking = action.payload?.data || action.payload;
        state.currentBookingDetail = booking;

        if (booking && (booking.id || booking.code)) {
          if (!state.data.bookings) state.data.bookings = {};
          if (booking.id) {
            state.data.bookings[booking.id] = {
              ...(state.data.bookings[booking.id] || {}),
              ...booking,
            };
          }
          if (booking.code) {
            state.data.bookings[booking.code] = {
              ...(state.data.bookings[booking.code] || {}),
              ...booking,
            };
          }
        }
      })
      .addCase(fetchBookingByIdThunk.rejected, (state, action) => {
        state.bookingDetailLoading = false;
        state.bookingDetailError = action.payload;
      })
      // fetchCities
      .addCase(fetchCitiesThunk.pending, (state) => {
        state.citiesLoading = true;
        state.citiesError = null;
      })
      .addCase(fetchCitiesThunk.fulfilled, (state, action) => {
        state.citiesLoading = false;
        const payload = action.payload;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.cities)
          ? payload.cities
          : Array.isArray(payload?.data?.cities)
          ? payload.data.cities
          : [];
        state.backendCities = list;
        state.citiesSummary =
          payload?.summary || payload?.data?.summary || null;

        // Keep state.data.cities in sync with backend
        if (!state.data.cities) state.data.cities = {};
        if (list.length > 0) {
          list.forEach((c) => {
            const key = c.cityId || c.id;
            state.data.cities[key] = {
              ...(state.data.cities[key] || {}),
              id: key,
              name: c.name,
              order: c.order !== null && c.order !== undefined ? c.order : state.data.cities[key]?.order || 99,
              phone: c.phone || '',
              whatsapp: c.whatsapp || '',
              hidden: !c.isLive,
              isLive: Boolean(c.isLive),
              notes: c.notes || '',
              stats: c.stats || null,
              backendId: c.id,
            };
          });
        }
      })
      .addCase(fetchCitiesThunk.rejected, (state, action) => {
        state.citiesLoading = false;
        state.citiesError = action.payload;
      })
      // createCity
      .addCase(createCityThunk.pending, (state) => {
        state.cityActionLoading = true;
        state.cityActionError = null;
      })
      .addCase(createCityThunk.fulfilled, (state, action) => {
        state.cityActionLoading = false;
        const newCity = action.payload?.data || action.payload;
        if (newCity) {
          state.backendCities = [
            newCity,
            ...state.backendCities.filter(
              (c) => c.id !== newCity.id && c.cityId !== newCity.cityId
            ),
          ];
          const key = newCity.cityId || newCity.id;
          if (!state.data.cities) state.data.cities = {};
          state.data.cities[key] = {
            id: key,
            name: newCity.name,
            order: newCity.order ?? 99,
            phone: newCity.phone || '',
            whatsapp: newCity.whatsapp || '',
            hidden: !newCity.isLive,
            isLive: Boolean(newCity.isLive),
            notes: newCity.notes || '',
            stats: newCity.stats || null,
            backendId: newCity.id,
          };
          if (state.citiesSummary) {
            state.citiesSummary.totalCities =
              (state.citiesSummary.totalCities || 0) + 1;
            if (newCity.isLive) {
              state.citiesSummary.liveCities =
                (state.citiesSummary.liveCities || 0) + 1;
            } else {
              state.citiesSummary.pausedCities =
                (state.citiesSummary.pausedCities || 0) + 1;
            }
          }
        }
      })
      .addCase(createCityThunk.rejected, (state, action) => {
        state.cityActionLoading = false;
        state.cityActionError = action.payload;
      })
      // updateCity
      .addCase(updateCityThunk.pending, (state) => {
        state.cityActionLoading = true;
        state.cityActionError = null;
      })
      .addCase(updateCityThunk.fulfilled, (state, action) => {
        state.cityActionLoading = false;
        const updated = action.payload?.data?.data || action.payload?.data;
        const id = action.payload?.id;
        if (updated) {
          state.backendCities = state.backendCities.map((c) =>
            c.id === id || c.cityId === id || c.id === updated.id || c.cityId === updated.cityId
              ? { ...c, ...updated }
              : c
          );
          const key = updated.cityId || updated.id || id;
          if (state.data.cities?.[key]) {
            state.data.cities[key] = {
              ...state.data.cities[key],
              name: updated.name ?? state.data.cities[key].name,
              phone: updated.phone ?? state.data.cities[key].phone,
              whatsapp: updated.whatsapp ?? state.data.cities[key].whatsapp,
              order: updated.order ?? state.data.cities[key].order,
              notes: updated.notes ?? state.data.cities[key].notes,
            };
          }
        }
      })
      .addCase(updateCityThunk.rejected, (state, action) => {
        state.cityActionLoading = false;
        state.cityActionError = action.payload;
      })
      // toggleCityStatus
      .addCase(toggleCityStatusThunk.fulfilled, (state, action) => {
        const updated = action.payload?.data?.data || action.payload?.data;
        const id = action.payload?.id;
        if (updated) {
          state.backendCities = state.backendCities.map((c) =>
            c.id === id || c.cityId === id || c.id === updated.id || c.cityId === updated.cityId
              ? { ...c, ...updated }
              : c
          );
          const key = updated.cityId || updated.id || id;
          if (state.data.cities?.[key]) {
            state.data.cities[key] = {
              ...state.data.cities[key],
              hidden: !updated.isLive,
              isLive: Boolean(updated.isLive),
            };
          }
          const liveCount = state.backendCities.filter((c) => c.isLive).length;
          const totalCount = state.backendCities.length;
          state.citiesSummary = {
            ...(state.citiesSummary || {}),
            totalCities: totalCount,
            liveCities: liveCount,
            pausedCities: totalCount - liveCount,
          };
        }
      })
      // deleteCity
      .addCase(deleteCityThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const resData = action.payload?.data?.data || action.payload?.data || {};
        const targetId = resData.id || id;
        const targetSlug = resData.cityId || id;

        state.backendCities = state.backendCities.filter(
          (c) => c.id !== targetId && c.cityId !== targetSlug && c.id !== id && c.cityId !== id
        );

        if (state.data.cities) {
          delete state.data.cities[targetSlug];
          delete state.data.cities[targetId];
          delete state.data.cities[id];
        }

        const liveCount = state.backendCities.filter((c) => c.isLive).length;
        const totalCount = state.backendCities.length;
        state.citiesSummary = {
          ...(state.citiesSummary || {}),
          totalCities: totalCount,
          liveCities: liveCount,
          pausedCities: totalCount - liveCount,
        };
      });
  },
});

export const {
  put,
  patch,
  remove,
  notify,
  setStatus,
  assign,
  unassign,
  setSelectedCity,
  loadDemoData,
  resetAllData,
  syncExternalData,
} = dataSlice.actions;

export default dataSlice.reducer;
