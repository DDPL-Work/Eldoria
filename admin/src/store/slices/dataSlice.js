import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  adminAPI,
  bookingAPI,
  cityAPI,
  staffAPI,
  clientAPI,
  serviceAPI,
} from '../../services/api';
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
      const res = await staffAPI.getStaffRequests(params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch staff requests');
    }
  }
);

/**
 * Async Thunk: Fetch Single Staff Registration Request by ID or staffId
 */
export const fetchStaffRequestByIdThunk = createAsyncThunk(
  'data/fetchStaffRequestById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await staffAPI.getStaffRequestById(id);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch staff request details');
    }
  }
);

/**
 * Async Thunk: Verify Staff Document
 */
export const verifyStaffDocumentThunk = createAsyncThunk(
  'data/verifyStaffDocument',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await staffAPI.verifyStaffDocument(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update document status');
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
      const res = await staffAPI.approveStaffRequest(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to approve staff');
    }
  }
);

/**
 * Async Thunk: Request Changes on Staff Registration Request
 */
export const requestStaffChangesThunk = createAsyncThunk(
  'data/requestStaffChanges',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await staffAPI.requestStaffChanges(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to request changes on staff application');
    }
  }
);

/**
 * Async Thunk: Reject Staff Request on Backend API
 */
export const rejectStaffThunk = createAsyncThunk(
  'data/rejectStaff',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await staffAPI.rejectStaffRequest(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to reject staff');
    }
  }
);

/**
 * Async Thunk: Revoke Decision on Staff Request / Move back to pending
 */
export const revokeStaffDecisionThunk = createAsyncThunk(
  'data/revokeStaffDecision',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await staffAPI.revokeStaffRequest(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to revoke staff request decision');
    }
  }
);

/**
 * Async Thunk: Fetch Clients from Backend API
 */
export const fetchClientsThunk = createAsyncThunk(
  'data/fetchClients',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await clientAPI.getClients(params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch clients');
    }
  }
);

/**
 * Async Thunk: Fetch Single Client by ID or clientId
 */
export const fetchClientByIdThunk = createAsyncThunk(
  'data/fetchClientById',
  async (clientId, { rejectWithValue }) => {
    try {
      const res = await clientAPI.getClientById(clientId);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch client details');
    }
  }
);

/**
 * Async Thunk: Fetch Dashboard Metrics & Data from Backend API
 */
export const fetchDashboardThunk = createAsyncThunk(
  'data/fetchDashboard',
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
export const fetchBookingsThunk = createAsyncThunk(
  'data/fetchBookings',
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
export const fetchBookingByIdThunk = createAsyncThunk(
  'data/fetchBookingById',
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
 * Async Thunk: Fetch Available Staff for Booking Matching from Backend API
 */
export const fetchAvailableStaffThunk = createAsyncThunk(
  'data/fetchAvailableStaff',
  async ({ id, params = '' }, { rejectWithValue }) => {
    try {
      const res = await bookingAPI.getAvailableStaff(id, params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch available staff');
    }
  }
);

/**
 * Async Thunk: Confirm Booking on Backend API
 */
export const confirmBookingThunk = createAsyncThunk(
  'data/confirmBooking',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await bookingAPI.confirmBooking(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to confirm booking');
    }
  }
);

/**
 * Async Thunk: Assign Staff to Booking on Backend API
 */
export const assignStaffThunk = createAsyncThunk(
  'data/assignStaff',
  async ({ id, staffId }, { rejectWithValue }) => {
    try {
      const res = await bookingAPI.assignStaff(id, { staffId });
      return { id, staffId, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to assign staff');
    }
  }
);

/**
 * Async Thunk: Unassign Staff from Booking on Backend API
 */
export const unassignStaffThunk = createAsyncThunk(
  'data/unassignStaff',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await bookingAPI.unassignStaff(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to unassign staff');
    }
  }
);

/**
 * Async Thunk: Update Booking Status on Backend API
 */
export const updateBookingStatusThunk = createAsyncThunk(
  'data/updateBookingStatus',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await bookingAPI.updateBookingStatus(id, payload);
      return { id, payload, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update booking status');
    }
  }
);

/**
 * Async Thunk: Create Booking on Backend API
 */
export const createBookingThunk = createAsyncThunk(
  'data/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const res = await bookingAPI.createBooking({
        ...bookingData,
        status: 'requested',
      });
      const booking = res?.data?.booking || res?.booking || res?.data || res;
      const bid = booking?.id || booking?.code;
      if (bid) {
        try {
          await bookingAPI.updateBookingStatus(bid, {
            status: 'requested',
            note: 'Booking request created by care desk',
          });
        } catch (statusErr) {
          console.warn('Backend status update to requested notice:', statusErr);
        }
      }
      return { ...booking, status: 'requested' };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create booking');
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

/**
 * Async Thunks: Services & Categories Management CRUD
 */
export const fetchServicesThunk = createAsyncThunk(
  'data/fetchServices',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await serviceAPI.getServices(params);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch services');
    }
  }
);

export const fetchServiceByIdThunk = createAsyncThunk(
  'data/fetchServiceById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.getServiceById(id);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch service details');
    }
  }
);

export const createServiceThunk = createAsyncThunk(
  'data/createService',
  async (serviceData, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.createService(serviceData);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create service');
    }
  }
);

export const updateServiceThunk = createAsyncThunk(
  'data/updateService',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.updateService(id, data);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update service');
    }
  }
);

export const toggleServiceStatusThunk = createAsyncThunk(
  'data/toggleServiceStatus',
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.toggleServiceStatus(id, payload);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to toggle service status');
    }
  }
);

export const reorderServicesThunk = createAsyncThunk(
  'data/reorderServices',
  async (data, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.reorderServices(data);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to reorder services');
    }
  }
);

export const deleteServiceThunk = createAsyncThunk(
  'data/deleteService',
  async (id, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.deleteService(id);
      return { id, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete service');
    }
  }
);

export const updateCategoryThunk = createAsyncThunk(
  'data/updateCategory',
  async ({ category, data }, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.updateCategory(category, data);
      return { category, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update category');
    }
  }
);

export const toggleCategoryStatusThunk = createAsyncThunk(
  'data/toggleCategoryStatus',
  async ({ category, payload = {} }, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.toggleCategoryStatus(category, payload);
      return { category, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to toggle category status');
    }
  }
);

export const deleteCategoryThunk = createAsyncThunk(
  'data/deleteCategory',
  async (category, { rejectWithValue }) => {
    try {
      const res = await serviceAPI.deleteCategory(category);
      return { category, data: res.data || res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete category');
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
    staffRequestsPagination: null,
    staffRequestsLoading: false,
    staffRequestsError: null,
    currentStaffRequest: null,
    staffRequestDetailLoading: false,
    staffRequestDetailError: null,
    backendClients: [],
    clientsPagination: null,
    currentClientDetail: null,
    clientDetailLoading: false,
    clientDetailError: null,
    backendServices: [],
    backendCategories: [],
    servicesSummary: null,
    servicesPagination: null,
    currentServiceDetail: null,
    servicesLoading: false,
    servicesError: null,
    serviceActionLoading: false,
    serviceActionError: null,
    backendBookings: [],
    bookingsPagination: null,
    bookingsLoading: false,
    bookingsError: null,
    currentBookingDetail: null,
    bookingDetailLoading: false,
    bookingDetailError: null,
    availableStaff: [],
    availableStaffCriteria: null,
    availableStaffCounts: null,
    availableStaffLoading: false,
    availableStaffError: null,
    bookingActionLoading: false,
    bookingActionError: null,
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
      if (b) {
        const hist = (b.history || []).concat([{ status, at: Date.now(), by: by || 'admin' }]);
        state.data.bookings[bookingId] = {
          ...b,
          status,
          history: hist,
          updatedAt: Date.now(),
          ...extra,
        };
      }
      if (Array.isArray(state.dashboardData?.needsAction)) {
        state.dashboardData.needsAction = state.dashboardData.needsAction.map((item) =>
          String(item.id) === String(bookingId) || String(item.code) === String(bookingId)
            ? { ...item, status }
            : item
        );
      }
    },
    assign: (state, action) => {
      const { bid, sid, by = 'admin' } = action.payload;
      if (!state.data.bookings) state.data.bookings = {};
      if (!state.data.staff) state.data.staff = {};

      let b = state.data.bookings[bid];
      if (!b && Array.isArray(state.dashboardData?.needsAction)) {
        const found = state.dashboardData.needsAction.find(
          (x) => String(x.id) === String(bid) || String(x.code) === String(bid)
        );
        if (found) {
          state.data.bookings[bid] = { ...found, id: bid };
          b = state.data.bookings[bid];
        }
      }

      let st = state.data.staff[sid];
      if (!st && Array.isArray(state.dashboardData?.staffAvailability)) {
        const foundStaff = state.dashboardData.staffAvailability.find(
          (x) => String(x.staffId || x.id) === String(sid)
        );
        if (foundStaff) {
          state.data.staff[sid] = {
            id: String(sid),
            staffId: foundStaff.staffId || String(sid),
            name: foundStaff.name,
            role: foundStaff.role || 'Caregiver',
            city: (foundStaff.city || 'mumbai').toLowerCase().trim(),
            onDuty: Boolean(foundStaff.onDuty),
            approval: 'approved',
          };
          st = state.data.staff[sid];
        }
      }

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

      // Also update dashboardData.needsAction so Dashboard immediately shows assigned staff
      if (Array.isArray(state.dashboardData?.needsAction)) {
        state.dashboardData.needsAction = state.dashboardData.needsAction.map((item) =>
          String(item.id) === String(bid) || String(item.code) === String(bid)
            ? { ...item, staffId: sid, status: 'assigned' }
            : item
        );
      }

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
      if (b && b.staffId) {
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
      }

      if (Array.isArray(state.dashboardData?.needsAction)) {
        state.dashboardData.needsAction = state.dashboardData.needsAction.map((item) =>
          String(item.id) === String(bid) || String(item.code) === String(bid)
            ? { ...item, staffId: null, status: 'confirmed' }
            : item
        );
      }
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
        state.staffRequestsLoading = true;
        state.error = null;
        state.staffRequestsError = null;
      })
      .addCase(fetchStaffRequestsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.staffRequestsLoading = false;
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

        // Keep state.data.staff in sync
        if (!state.data.staff) state.data.staff = {};
        list.forEach((s) => {
          if (s && (s.id || s.staffId)) {
            const key = String(s.staffId || s.id);
            const userName = s.user?.name || s.name || 'Staff Member';
            const userPhone = s.user?.phone || s.phone || '';
            const userEmail = s.user?.email || s.email || '';
            let skillsStr = '';
            if (Array.isArray(s.skills)) {
              skillsStr = s.skills.join(', ');
            } else if (typeof s.skills === 'string') {
              try {
                const parsed = JSON.parse(s.skills);
                skillsStr = Array.isArray(parsed) ? parsed.join(', ') : s.skills;
              } catch {
                skillsStr = s.skills;
              }
            }

            state.data.staff[key] = {
              ...(state.data.staff[key] || {}),
              id: key,
              backendId: s.id,
              staffId: s.staffId || key,
              name: userName,
              phone: userPhone,
              email: userEmail,
              role: s.qualification || s.role || 'Caregiver',
              qualification: s.qualification || '',
              city: (s.city || 'mumbai').toLowerCase().trim(),
              area: s.area || '',
              skills: skillsStr,
              docs: s.docs || 'pending',
              approval: s.approval || 'approved',
              applied: s.applied !== undefined ? Boolean(s.applied) : true,
              files: s.files || {},
              docChecks: s.docChecks || {},
              onDuty: Boolean(s.onDuty),
              experience: s.experience || 0,
              regNo: s.regNo || '',
              dob: s.dob || '',
              gender: s.gender || '',
              raw: s,
            };
          }
        });
      })
      .addCase(fetchStaffRequestsThunk.rejected, (state, action) => {
        state.loading = false;
        state.staffRequestsLoading = false;
        state.error = action.payload;
        state.staffRequestsError = action.payload;
      })
      // fetchStaffRequestById
      .addCase(fetchStaffRequestByIdThunk.pending, (state) => {
        state.staffRequestDetailLoading = true;
        state.staffRequestDetailError = null;
      })
      .addCase(fetchStaffRequestByIdThunk.fulfilled, (state, action) => {
        state.staffRequestDetailLoading = false;
        const staffObj = action.payload?.data || action.payload;
        state.currentStaffRequest = staffObj;
        if (staffObj && (staffObj.id || staffObj.staffId)) {
          const sId = String(staffObj.id || staffObj.staffId);
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === sId || String(item.staffId) === sId
              ? { ...item, ...staffObj }
              : item
          );
          if (state.data?.staff) {
            const key = state.data.staff[sId]
              ? sId
              : staffObj.staffId && state.data.staff[String(staffObj.staffId)]
              ? String(staffObj.staffId)
              : null;
            if (key) {
              state.data.staff[key] = {
                ...state.data.staff[key],
                ...staffObj,
                files: staffObj.files || state.data.staff[key].files || {},
                applied: true,
              };
            }
          }
        }
      })
      .addCase(fetchStaffRequestByIdThunk.rejected, (state, action) => {
        state.staffRequestDetailLoading = false;
        state.staffRequestDetailError = action.payload;
      })
      // verifyStaffDocument
      .addCase(verifyStaffDocumentThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const resData = action.payload?.data?.staff || action.payload?.data || {};
        if (id) {
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === String(id) || String(item.staffId) === String(id)
              ? { ...item, ...resData }
              : item
          );
          if (
            state.currentStaffRequest &&
            (String(state.currentStaffRequest.id) === String(id) ||
              String(state.currentStaffRequest.staffId) === String(id))
          ) {
            state.currentStaffRequest = { ...state.currentStaffRequest, ...resData };
          }
          if (state.data?.staff) {
            const key = String(id);
            if (state.data.staff[key]) {
              state.data.staff[key] = {
                ...state.data.staff[key],
                ...(resData.docChecks ? { docChecks: resData.docChecks } : {}),
                ...(resData.docs ? { docs: resData.docs } : {}),
              };
            }
          }
        }
      })
      // approveStaff
      .addCase(approveStaffThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const updatedStaff = action.payload?.data?.data || action.payload?.data?.staff || action.payload?.data;
        if (id) {
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === String(id) || String(item.staffId) === String(id)
              ? {
                  ...item,
                  approval: 'approved',
                  docs: 'verified',
                  ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
                }
              : item
          );
          if (
            state.currentStaffRequest &&
            (String(state.currentStaffRequest.id) === String(id) ||
              String(state.currentStaffRequest.staffId) === String(id))
          ) {
            state.currentStaffRequest = {
              ...state.currentStaffRequest,
              approval: 'approved',
              docs: 'verified',
              ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
            };
          }
          if (state.data?.staff) {
            const key = String(id);
            if (state.data.staff[key]) {
              state.data.staff[key] = {
                ...state.data.staff[key],
                approval: 'approved',
                docs: 'verified',
                onDuty: false,
              };
            }
          }
        }
      })
      // requestStaffChanges
      .addCase(requestStaffChangesThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const updatedStaff = action.payload?.data?.data || action.payload?.data?.staff || action.payload?.data;
        if (id) {
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === String(id) || String(item.staffId) === String(id)
              ? {
                  ...item,
                  approval: 'changes',
                  ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
                }
              : item
          );
          if (
            state.currentStaffRequest &&
            (String(state.currentStaffRequest.id) === String(id) ||
              String(state.currentStaffRequest.staffId) === String(id))
          ) {
            state.currentStaffRequest = {
              ...state.currentStaffRequest,
              approval: 'changes',
              ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
            };
          }
          if (state.data?.staff) {
            const key = String(id);
            if (state.data.staff[key]) {
              state.data.staff[key] = {
                ...state.data.staff[key],
                approval: 'changes',
                docs: 'pending',
              };
            }
          }
        }
      })
      // rejectStaff
      .addCase(rejectStaffThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const updatedStaff = action.payload?.data?.data || action.payload?.data?.staff || action.payload?.data;
        if (id) {
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === String(id) || String(item.staffId) === String(id)
              ? {
                  ...item,
                  approval: 'rejected',
                  ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
                }
              : item
          );
          if (
            state.currentStaffRequest &&
            (String(state.currentStaffRequest.id) === String(id) ||
              String(state.currentStaffRequest.staffId) === String(id))
          ) {
            state.currentStaffRequest = {
              ...state.currentStaffRequest,
              approval: 'rejected',
              ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
            };
          }
          if (state.data?.staff) {
            const key = String(id);
            if (state.data.staff[key]) {
              state.data.staff[key] = {
                ...state.data.staff[key],
                approval: 'rejected',
                docs: 'rejected',
              };
            }
          }
        }
      })
      // revokeStaffDecision
      .addCase(revokeStaffDecisionThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const updatedStaff = action.payload?.data?.data || action.payload?.data?.staff || action.payload?.data;
        if (id) {
          state.backendStaffRequests = (state.backendStaffRequests || []).map((item) =>
            String(item.id) === String(id) || String(item.staffId) === String(id)
              ? {
                  ...item,
                  approval: 'pending',
                  docs: 'pending',
                  ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
                }
              : item
          );
          if (
            state.currentStaffRequest &&
            (String(state.currentStaffRequest.id) === String(id) ||
              String(state.currentStaffRequest.staffId) === String(id))
          ) {
            state.currentStaffRequest = {
              ...state.currentStaffRequest,
              approval: 'pending',
              docs: 'pending',
              ...(updatedStaff && typeof updatedStaff === 'object' ? updatedStaff : {}),
            };
          }
          if (state.data?.staff) {
            const key = String(id);
            if (state.data.staff[key]) {
              state.data.staff[key] = {
                ...state.data.staff[key],
                approval: 'pending',
                docs: 'pending',
              };
            }
          }
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
      // fetchClientById
      .addCase(fetchClientByIdThunk.pending, (state) => {
        state.clientDetailLoading = true;
        state.clientDetailError = null;
      })
      .addCase(fetchClientByIdThunk.fulfilled, (state, action) => {
        state.clientDetailLoading = false;
        state.currentClientDetail = action.payload?.data || action.payload;
      })
      .addCase(fetchClientByIdThunk.rejected, (state, action) => {
        state.clientDetailLoading = false;
        state.clientDetailError = action.payload;
      })
      // fetchDashboard
      .addCase(fetchDashboardThunk.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchDashboardThunk.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        const payload = action.payload;
        const dData = payload?.data || payload;
        state.dashboardData = dData;

        // Sync staffAvailability into state.data.staff
        if (Array.isArray(dData?.staffAvailability)) {
          if (!state.data.staff) state.data.staff = {};
          dData.staffAvailability.forEach((s) => {
            const key = String(s.staffId || s.id);
            if (!state.data.staff[key]) {
              state.data.staff[key] = {
                id: key,
                backendId: s.id,
                staffId: s.staffId || key,
                name: s.name,
                phone: s.phone || '',
                role: s.role || 'Caregiver',
                city: (s.city || 'mumbai').toLowerCase().trim(),
                area: s.area || '',
                approval: 'approved',
                onDuty: Boolean(s.onDuty),
              };
            }
          });
        }

        // Sync needsAction into state.data.bookings
        if (Array.isArray(dData?.needsAction)) {
          if (!state.data.bookings) state.data.bookings = {};
          dData.needsAction.forEach((b) => {
            const key = String(b.id || b.code);
            if (!state.data.bookings[key]) {
              state.data.bookings[key] = {
                ...b,
                id: key,
                backendId: b.id,
              };
            }
          });
        }
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
      // fetchAvailableStaff
      .addCase(fetchAvailableStaffThunk.pending, (state) => {
        state.availableStaffLoading = true;
        state.availableStaffError = null;
      })
      .addCase(fetchAvailableStaffThunk.fulfilled, (state, action) => {
        state.availableStaffLoading = false;
        const payloadData = action.payload?.data || action.payload || {};
        state.availableStaff = Array.isArray(payloadData)
          ? payloadData
          : Array.isArray(payloadData.matches)
          ? payloadData.matches
          : Array.isArray(payloadData.availableStaff)
          ? payloadData.availableStaff
          : Array.isArray(payloadData.staff)
          ? payloadData.staff
          : [];
        state.availableStaffCriteria = payloadData.searchCriteria || null;
        state.availableStaffCounts = payloadData.counts || null;
      })
      .addCase(fetchAvailableStaffThunk.rejected, (state, action) => {
        state.availableStaffLoading = false;
        state.availableStaff = [];
        state.availableStaffError = action.payload;
      })
      // confirmBooking
      .addCase(confirmBookingThunk.pending, (state) => {
        state.bookingActionLoading = true;
        state.bookingActionError = null;
      })
      .addCase(confirmBookingThunk.fulfilled, (state, action) => {
        state.bookingActionLoading = false;
        const { id, data } = action.payload;
        const booking = data?.booking || data;
        if (state.currentBookingDetail && (String(state.currentBookingDetail.id) === String(id) || String(state.currentBookingDetail.code) === String(id))) {
          state.currentBookingDetail.status = 'confirmed';
          if (booking && typeof booking === 'object') {
            state.currentBookingDetail = { ...state.currentBookingDetail, ...booking };
          }
        }
        if (state.data?.bookings) {
          if (state.data.bookings[id]) {
            state.data.bookings[id].status = 'confirmed';
          }
        }
      })
      .addCase(confirmBookingThunk.rejected, (state, action) => {
        state.bookingActionLoading = false;
        state.bookingActionError = action.payload;
      })
      // assignStaff
      .addCase(assignStaffThunk.pending, (state) => {
        state.bookingActionLoading = true;
        state.bookingActionError = null;
      })
      .addCase(assignStaffThunk.fulfilled, (state, action) => {
        state.bookingActionLoading = false;
        const { id, staffId, data } = action.payload;
        const booking = data?.booking || data;
        if (state.currentBookingDetail && (String(state.currentBookingDetail.id) === String(id) || String(state.currentBookingDetail.code) === String(id))) {
          state.currentBookingDetail.staffId = staffId;
          state.currentBookingDetail.status = 'assigned';
          if (booking && typeof booking === 'object') {
            state.currentBookingDetail = { ...state.currentBookingDetail, ...booking };
          }
        }
        if (state.data?.bookings && state.data.bookings[id]) {
          state.data.bookings[id].staffId = staffId;
          state.data.bookings[id].status = 'assigned';
        }
      })
      .addCase(assignStaffThunk.rejected, (state, action) => {
        state.bookingActionLoading = false;
        state.bookingActionError = action.payload;
      })
      // unassignStaff
      .addCase(unassignStaffThunk.pending, (state) => {
        state.bookingActionLoading = true;
        state.bookingActionError = null;
      })
      .addCase(unassignStaffThunk.fulfilled, (state, action) => {
        state.bookingActionLoading = false;
        const { id } = action.payload;
        if (state.currentBookingDetail && (String(state.currentBookingDetail.id) === String(id) || String(state.currentBookingDetail.code) === String(id))) {
          state.currentBookingDetail.staffId = null;
          state.currentBookingDetail.assignedStaff = null;
          state.currentBookingDetail.status = 'confirmed';
        }
        if (state.data?.bookings && state.data.bookings[id]) {
          state.data.bookings[id].staffId = null;
          state.data.bookings[id].status = 'confirmed';
        }
      })
      .addCase(unassignStaffThunk.rejected, (state, action) => {
        state.bookingActionLoading = false;
        state.bookingActionError = action.payload;
      })
      // updateBookingStatus
      .addCase(updateBookingStatusThunk.pending, (state) => {
        state.bookingActionLoading = true;
        state.bookingActionError = null;
      })
      .addCase(updateBookingStatusThunk.fulfilled, (state, action) => {
        state.bookingActionLoading = false;
        const { id, payload, data } = action.payload;
        const newStatus = payload?.status;
        if (state.currentBookingDetail && (String(state.currentBookingDetail.id) === String(id) || String(state.currentBookingDetail.code) === String(id))) {
          if (newStatus) state.currentBookingDetail.status = newStatus;
          if (data && typeof data === 'object') {
            state.currentBookingDetail = { ...state.currentBookingDetail, ...(data.booking || data) };
          }
        }
        if (state.data?.bookings && state.data.bookings[id] && newStatus) {
          state.data.bookings[id].status = newStatus;
        }
      })
      .addCase(updateBookingStatusThunk.rejected, (state, action) => {
        state.bookingActionLoading = false;
        state.bookingActionError = action.payload;
      })
      // createBooking
      .addCase(createBookingThunk.pending, (state) => {
        state.bookingActionLoading = true;
        state.bookingActionError = null;
      })
      .addCase(createBookingThunk.fulfilled, (state, action) => {
        state.bookingActionLoading = false;
        const booking = action.payload?.booking || action.payload?.data || action.payload;
        if (booking && (booking.id || booking.code)) {
          const key = booking.id || booking.code;
          const cleanBooking = { ...booking, status: 'requested' };
          if (!state.data.bookings) state.data.bookings = {};
          state.data.bookings[key] = cleanBooking;
          if (Array.isArray(state.backendBookings)) {
            state.backendBookings = state.backendBookings.filter(
              (b) => b.id !== key && b.code !== key && b.code !== cleanBooking.code
            );
            state.backendBookings.unshift(cleanBooking);
          }
        }
      })
      .addCase(createBookingThunk.rejected, (state, action) => {
        state.bookingActionLoading = false;
        state.bookingActionError = action.payload;
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
      })
      // fetchServices
      .addCase(fetchServicesThunk.pending, (state) => {
        state.servicesLoading = true;
        state.servicesError = null;
      })
      .addCase(fetchServicesThunk.fulfilled, (state, action) => {
        state.servicesLoading = false;
        const payload = action.payload;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.services)
          ? payload.services
          : Array.isArray(payload?.data?.services)
          ? payload.data.services
          : [];
        state.backendServices = list;
        state.servicesPagination =
          payload?.pagination || payload?.data?.pagination || null;

        const catList = Array.isArray(payload?.categories)
          ? payload.categories
          : Array.isArray(payload?.data?.categories)
          ? payload.data.categories
          : [];
        state.backendCategories = catList;
        state.servicesSummary =
          payload?.summary || payload?.data?.summary || null;

        // Keep state.data.services & state.data.categories in sync
        if (!state.data.services) state.data.services = {};
        if (!state.data.categories) state.data.categories = {};

        // Sync categories from grouped response if available
        if (catList.length > 0) {
          catList.forEach((c) => {
            if (c && c.id) {
              state.data.categories[c.id] = {
                ...(state.data.categories[c.id] || {}),
                id: c.id,
                name: c.name || c.id,
                desc: c.desc || '',
                icon: c.icon || 'cross',
                kind: c.kind || c.type || 'care',
                order: c.order ?? 0,
                enabled: c.enabled !== false,
                comingSoon: Boolean(c.comingSoon),
                servicesCount: c.servicesCount || 0,
                liveCount: c.liveCount || 0,
              };
            }
          });
        }

        // Sync all individual services
        list.forEach((s) => {
          if (s && (s.id || s.code)) {
            const key = s.code || s.serviceId || String(s.id);
            state.data.services[key] = {
              ...(state.data.services[key] || {}),
              ...s,
              id: key,
              backendId: s.id,
              categoryId: s.category || s.categoryId,
            };
            if (s.category && !state.data.categories[s.category]) {
              const catKey = s.category;
              state.data.categories[catKey] = {
                id: catKey,
                name: s.categoryName || catKey,
                icon: s.categoryIcon || 'cross',
                desc: s.categoryDesc || '',
                kind: s.type || 'care',
                order: s.categoryOrder ?? 0,
                enabled: s.enabled !== false,
                comingSoon: Boolean(s.comingSoon),
              };
            }
          }
        });
      })
      .addCase(fetchServicesThunk.rejected, (state, action) => {
        state.servicesLoading = false;
        state.servicesError = action.payload;
      })
      // fetchServiceById
      .addCase(fetchServiceByIdThunk.pending, (state) => {
        state.servicesLoading = true;
        state.servicesError = null;
      })
      .addCase(fetchServiceByIdThunk.fulfilled, (state, action) => {
        state.servicesLoading = false;
        state.currentServiceDetail = action.payload?.data || action.payload;
      })
      .addCase(fetchServiceByIdThunk.rejected, (state, action) => {
        state.servicesLoading = false;
        state.servicesError = action.payload;
      })
      // createService
      .addCase(createServiceThunk.pending, (state) => {
        state.serviceActionLoading = true;
        state.serviceActionError = null;
      })
      .addCase(createServiceThunk.fulfilled, (state, action) => {
        state.serviceActionLoading = false;
        const newService = action.payload?.data?.data || action.payload?.data || action.payload;
        if (newService && (newService.id || newService.code)) {
          state.backendServices = [newService, ...state.backendServices];
          const key = newService.code || newService.serviceId || String(newService.id);
          if (!state.data.services) state.data.services = {};
          state.data.services[key] = {
            ...newService,
            id: key,
            backendId: newService.id,
            categoryId: newService.category || newService.categoryId,
          };
          if (newService.category) {
            const catKey = newService.category;
            if (!state.data.categories) state.data.categories = {};
            state.data.categories[catKey] = {
              id: catKey,
              name: newService.categoryName || catKey,
              icon: newService.categoryIcon || 'cross',
              desc: newService.categoryDesc || '',
              kind: newService.type || 'care',
              order: newService.categoryOrder ?? 0,
              ...(state.data.categories[catKey] || {}),
            };
          }
        }
      })
      .addCase(createServiceThunk.rejected, (state, action) => {
        state.serviceActionLoading = false;
        state.serviceActionError = action.payload;
      })
      // updateService
      .addCase(updateServiceThunk.pending, (state) => {
        state.serviceActionLoading = true;
        state.serviceActionError = null;
      })
      .addCase(updateServiceThunk.fulfilled, (state, action) => {
        state.serviceActionLoading = false;
        const updated = action.payload?.data?.data || action.payload?.data || action.payload;
        const id = action.payload?.id;
        if (updated) {
          state.backendServices = state.backendServices.map((s) =>
            s.id === id || s.code === id || s.id === updated.id || s.code === updated.code
              ? { ...s, ...updated }
              : s
          );
          const key = updated.code || updated.serviceId || String(updated.id) || id;
          if (!state.data.services) state.data.services = {};
          state.data.services[key] = {
            ...(state.data.services[key] || {}),
            ...updated,
            id: key,
            backendId: updated.id,
            categoryId: updated.category || updated.categoryId,
          };
        }
      })
      .addCase(updateServiceThunk.rejected, (state, action) => {
        state.serviceActionLoading = false;
        state.serviceActionError = action.payload;
      })
      // toggleServiceStatus
      .addCase(toggleServiceStatusThunk.fulfilled, (state, action) => {
        const updated = action.payload?.data?.data || action.payload?.data || action.payload;
        const id = action.payload?.id;
        if (updated) {
          state.backendServices = state.backendServices.map((s) =>
            s.id === id || s.code === id || s.id === updated.id || s.code === updated.code
              ? { ...s, enabled: updated.enabled }
              : s
          );
          const key = updated.code || updated.serviceId || String(updated.id) || id;
          if (state.data.services?.[key]) {
            state.data.services[key] = {
              ...state.data.services[key],
              enabled: updated.enabled,
            };
          }
        }
      })
      // reorderServices
      .addCase(reorderServicesThunk.fulfilled, (state) => {
        state.serviceActionLoading = false;
      })
      // deleteService
      .addCase(deleteServiceThunk.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const resData = action.payload?.data?.data || action.payload?.data || {};
        const targetId = resData.id || id;
        const targetCode = resData.code || id;

        state.backendServices = state.backendServices.filter(
          (s) => s.id !== targetId && s.code !== targetCode && s.id !== id && s.code !== id
        );
        if (state.data.services) {
          delete state.data.services[targetCode];
          delete state.data.services[targetId];
          delete state.data.services[id];
        }
      })
      .addCase(deleteServiceThunk.rejected, (state, action) => {
        state.serviceActionError = action.payload;
      })
      // updateCategory
      .addCase(updateCategoryThunk.fulfilled, (state, action) => {
        const category = action.payload?.category;
        const resData = action.payload?.data?.data || action.payload?.data || {};
        const targetCat = resData.category || category;
        if (state.data.categories?.[category]) {
          state.data.categories[targetCat] = {
            ...state.data.categories[category],
            id: targetCat,
            name: targetCat,
          };
          if (category !== targetCat) {
            delete state.data.categories[category];
            // Also update any services that had old category name
            if (state.data.services) {
              Object.keys(state.data.services).forEach((k) => {
                if (state.data.services[k]?.categoryId === category || state.data.services[k]?.category === category) {
                  state.data.services[k] = {
                    ...state.data.services[k],
                    category: targetCat,
                    categoryId: targetCat,
                  };
                }
              });
            }
          }
        }
      })
      .addCase(updateCategoryThunk.rejected, (state, action) => {
        state.serviceActionError = action.payload;
      })
      // toggleCategoryStatus
      .addCase(toggleCategoryStatusThunk.fulfilled, (state, action) => {
        const category = action.payload?.category;
        const resData = action.payload?.data?.data || action.payload?.data || {};
        const enabled = resData.enabled !== undefined ? resData.enabled : action.payload?.payload?.enabled;
        if (category && enabled !== undefined) {
          state.backendServices = state.backendServices.map((s) =>
            s.category === category ? { ...s, enabled: Boolean(enabled) } : s
          );
          if (state.data.categories?.[category]) {
            state.data.categories[category] = {
              ...state.data.categories[category],
              enabled: Boolean(enabled),
            };
          }
          if (state.data.services) {
            Object.keys(state.data.services).forEach((k) => {
              if (state.data.services[k]?.categoryId === category || state.data.services[k]?.category === category) {
                state.data.services[k] = { ...state.data.services[k], enabled: Boolean(enabled) };
              }
            });
          }
        }
      })
      .addCase(toggleCategoryStatusThunk.rejected, (state, action) => {
        state.serviceActionError = action.payload;
      })
      // deleteCategory
      .addCase(deleteCategoryThunk.fulfilled, (state, action) => {
        const category = action.payload?.category;
        if (category) {
          state.backendServices = state.backendServices.filter((s) => s.category !== category);
          if (state.data.categories) {
            delete state.data.categories[category];
          }
          if (state.data.services) {
            Object.keys(state.data.services).forEach((k) => {
              if (state.data.services[k]?.categoryId === category || state.data.services[k]?.category === category) {
                delete state.data.services[k];
              }
            });
          }
        }
      })
      .addCase(deleteCategoryThunk.rejected, (state, action) => {
        state.serviceActionError = action.payload;
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
