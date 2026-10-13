import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminAPI } from '../../services/api';

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

const getInitialData = () => ({
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
});

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

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    data: getInitialData(),
    selectedCity: getInitialCity(),
    backendStaffRequests: [],
    backendClients: [],
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
