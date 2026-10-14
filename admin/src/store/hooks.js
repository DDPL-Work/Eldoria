import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { DEFAULT_CITIES } from '../constants/data';

// Action and thunk imports
import {
  loginAdmin,
  logout as logoutAction,
  fetchAdminProfile,
  updateAdminProfile,
  clearAuthError,
} from './slices/authSlice';

import {
  put as putAction,
  patch as patchAction,
  remove as removeAction,
  notify as notifyAction,
  setStatus as setStatusAction,
  assign as assignAction,
  unassign as unassignAction,
  setSelectedCity as setSelectedCityAction,
  loadDemoData as loadDemoDataAction,
  resetAllData as resetAllDataAction,
  fetchStaffRequestsThunk,
  approveStaffThunk,
  rejectStaffThunk,
  fetchClientsThunk,
  fetchDashboardThunk,
  fetchBookingsThunk,
  fetchBookingByIdThunk,
  fetchCitiesThunk,
  getCityByIdThunk,
  createCityThunk,
  updateCityThunk,
  toggleCityStatusThunk,
  deleteCityThunk,
  syncExternalData as syncExternalDataAction,
} from './slices/dataSlice';

import {
  showToast as showToastAction,
  clearToast as clearToastAction,
  openPreview as openPreviewAction,
  closePreview as closePreviewAction,
  toggleSidebarCollapse as toggleSidebarCollapseAction,
  setSidebarCollapsed as setSidebarCollapsedAction,
} from './slices/uiSlice';

import { uploadFileThunk, compressImage } from './slices/filesSlice';

/**
 * Standard typed Redux hooks
 */
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

/**
 * Redux-backed useAuth hook
 */
export function useAuth() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token, loading, error } = useSelector(
    (state) => state.auth
  );

  const login = useCallback(
    async (email = 'admin@eldoria.care', password = '', rememberMe = true) => {
      try {
        const result = await dispatch(
          loginAdmin({ email, password, rememberMe })
        ).unwrap();
        return { success: true, data: result };
      } catch (err) {
        return { success: false, message: err || 'Authentication failed' };
      }
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const fetchProfile = useCallback(() => {
    return dispatch(fetchAdminProfile());
  }, [dispatch]);

  const updateProfile = useCallback((profileData) => {
    return dispatch(updateAdminProfile(profileData));
  }, [dispatch]);

  return {
    isAuthenticated,
    user,
    token,
    loading,
    error,
    login,
    logout,
    clearError,
    fetchProfile,
    updateProfile,
  };
}

/**
 * Redux-backed useUI hook
 */
export function useUI() {
  const dispatch = useDispatch();
  const { toastMessage, previewFileId, sidebarCollapsed } = useSelector(
    (state) => state.ui
  );

  const showToast = useCallback(
    (msg) => dispatch(showToastAction(msg)),
    [dispatch]
  );
  const clearToast = useCallback(
    () => dispatch(clearToastAction()),
    [dispatch]
  );
  const openPreview = useCallback(
    (id) => dispatch(openPreviewAction(id)),
    [dispatch]
  );
  const closePreview = useCallback(
    () => dispatch(closePreviewAction()),
    [dispatch]
  );
  const toggleSidebarCollapse = useCallback(
    () => dispatch(toggleSidebarCollapseAction()),
    [dispatch]
  );
  const setSidebarCollapsed = useCallback(
    (val) => dispatch(setSidebarCollapsedAction(val)),
    [dispatch]
  );

  return {
    toastMessage,
    showToast,
    clearToast,
    previewFileId,
    openPreview,
    closePreview,
    sidebarCollapsed,
    toggleSidebarCollapse,
    setSidebarCollapsed,
  };
}

/**
 * Redux-backed useFiles hook
 */
export function useFiles() {
  const dispatch = useDispatch();
  const { cache, uploading, error } = useSelector((state) => state.files);

  const uploadFile = useCallback(
    async (file, maxDim = 1200) => {
      const res = await dispatch(uploadFileThunk({ file, maxDim })).unwrap();
      return { id: res.id, ...res.meta };
    },
    [dispatch]
  );

  const fileGet = useCallback(
    (id) => {
      if (!id) return null;
      return cache[id] || null;
    },
    [cache]
  );

  return {
    cache,
    uploading,
    error,
    uploadFile,
    fileGet,
    compressImage,
  };
}

/**
 * Redux-backed useStore hook
 * Full replacement for StoreContext using Redux Toolkit state & reducers
 */
export function useStore() {
  const dispatch = useDispatch();
  const data = useSelector((state) => state.data.data);
  const selectedCity = useSelector((state) => state.data.selectedCity);
  const backendStaffRequests = useSelector(
    (state) => state.data.backendStaffRequests
  );
  const backendClients = useSelector((state) => state.data.backendClients);
  const dashboardData = useSelector((state) => state.data.dashboardData);
  const dashboardLoading = useSelector((state) => state.data.dashboardLoading);
  const dashboardError = useSelector((state) => state.data.dashboardError);
  const backendBookings = useSelector((state) => state.data.backendBookings);
  const bookingsPagination = useSelector((state) => state.data.bookingsPagination);
  const bookingsLoading = useSelector((state) => state.data.bookingsLoading);
  const bookingsError = useSelector((state) => state.data.bookingsError);
  const currentBookingDetail = useSelector((state) => state.data.currentBookingDetail);
  const bookingDetailLoading = useSelector((state) => state.data.bookingDetailLoading);
  const bookingDetailError = useSelector((state) => state.data.bookingDetailError);
  const backendCities = useSelector((state) => state.data.backendCities);
  const citiesSummary = useSelector((state) => state.data.citiesSummary);
  const citiesLoading = useSelector((state) => state.data.citiesLoading);
  const citiesError = useSelector((state) => state.data.citiesError);
  const cityActionLoading = useSelector((state) => state.data.cityActionLoading);
  const cityActionError = useSelector((state) => state.data.cityActionError);
  const dataLoading = useSelector((state) => state.data.loading);
  const dataError = useSelector((state) => state.data.error);

  // Redux action dispatches
  const put = useCallback(
    (col, id, doc) => dispatch(putAction({ col, id, doc })),
    [dispatch]
  );

  const patch = useCallback(
    (col, id, doc) => dispatch(patchAction({ col, id, doc })),
    [dispatch]
  );

  const remove = useCallback(
    (col, id) => dispatch(removeAction({ col, id })),
    [dispatch]
  );

  const notify = useCallback(
    (to, title, body, bookingId, extra = {}) =>
      dispatch(notifyAction({ to, title, body, bookingId, extra })),
    [dispatch]
  );

  const setStatus = useCallback(
    (b, status, extra = {}, by = 'admin') => {
      const bookingId = typeof b === 'string' ? b : b?.id;
      dispatch(setStatusAction({ bookingId, status, extra, by }));
    },
    [dispatch]
  );

  const assign = useCallback(
    (bid, sid, by = 'admin') => {
      dispatch(assignAction({ bid, sid, by }));
      return true;
    },
    [dispatch]
  );

  const unassign = useCallback(
    (bid) => {
      dispatch(unassignAction({ bid }));
    },
    [dispatch]
  );

  const setSelectedCity = useCallback(
    (city) => dispatch(setSelectedCityAction(city)),
    [dispatch]
  );

  const loadDemoData = useCallback(
    () => dispatch(loadDemoDataAction()),
    [dispatch]
  );

  const resetAllData = useCallback(
    () => dispatch(resetAllDataAction()),
    [dispatch]
  );

  const syncExternalData = useCallback(
    (newData) => dispatch(syncExternalDataAction(newData)),
    [dispatch]
  );

  // Helper queries and derived selectors
  const byOrder = (a, b) =>
    (a.order || 999) - (b.order || 999) ||
    String(a.name).localeCompare(String(b.name));

  const catsAll = useCallback(
    () => Object.values(data.categories || {}).filter((c) => c.name).sort(byOrder),
    [data.categories]
  );

  const catOf = useCallback(
    (id) => data.categories?.[id] || { name: 'Other', icon: 'cross', kind: 'care' },
    [data.categories]
  );

  const svcAll = useCallback(
    () => Object.values(data.services || {}).filter((x) => x.name).sort(byOrder),
    [data.services]
  );

  const svcLive = useCallback(
    (x) => x.enabled !== false && catOf(x.categoryId).enabled !== false,
    [catOf]
  );

  const svcBookable = useCallback(
    (x) => svcLive(x) && !catOf(x.categoryId).comingSoon,
    [svcLive, catOf]
  );

  const services = useCallback(
    () =>
      catsAll().flatMap((c) =>
        svcAll().filter((x) => x.categoryId === c.id && svcBookable(x))
      ),
    [catsAll, svcAll, svcBookable]
  );

  const svcInCat = useCallback(
    (cid, all = true) =>
      svcAll().filter((x) => x.categoryId === cid && (all || svcLive(x))),
    [svcAll, svcLive]
  );

  const svc = useCallback(
    (id) =>
      data.services?.[id] || {
        id,
        name: 'Service',
        tasks: [],
        options: [],
        icon: 'cross',
      },
    [data.services]
  );

  const svcB = useCallback(
    (b) =>
      data.services?.[b?.service]
        ? data.services[b.service]
        : {
            id: b?.service,
            name: b?.serviceName || 'Service',
            tasks: [],
            options: [],
            icon: 'cross',
          },
    [data.services]
  );

  const citiesAll = useCallback(() => {
    return Object.values(data.cities || {}).sort(
      (a, b) => (a.order || 99) - (b.order || 99)
    );
  }, [data.cities]);

  const cities = useCallback(
    () => citiesAll().filter((c) => !c.hidden),
    [citiesAll]
  );

  const cityName = useCallback(
    (id) => (citiesAll().find((c) => c.id === id) || { name: id || '—' }).name,
    [citiesAll]
  );

  const bookingsAll = useCallback(
    () =>
      Object.values(data.bookings || {}).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      ),
    [data.bookings]
  );

  const inCity = useCallback(
    (list, key = (x) => x?.city || '') => {
      if (!list) return [];
      if (selectedCity === 'all') return list;
      return list.filter((item) => key(item) === selectedCity);
    },
    [selectedCity]
  );

  const filterByCity = inCity;

  const sCity = useCallback((s) => s?.city || '', []);
  const bCity = useCallback((b) => b?.city || '', []);
  const apprOf = useCallback(
    (a) => a?.approval || (a?.applied ? 'pending' : 'approved'),
    []
  );

  const staffCanConfirm = useCallback(
    () => data.settings?.app?.staffCanConfirm !== false,
    [data.settings]
  );

  const staffList = useCallback(
    () =>
      Object.values(data.staff || {})
        .filter((s) => (s.approval || 'approved') === 'approved')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.staff]
  );

const normalizeStaffRequest = (req) => {
  if (!req) return null;
  const u = req.user || {};
  let skills = [];
  if (Array.isArray(req.skills)) skills = req.skills;
  else if (typeof req.skills === 'string') {
    try { skills = JSON.parse(req.skills); } catch { skills = req.skills.split(',').map((s) => s.trim()).filter(Boolean); }
  }

  let languages = [];
  if (Array.isArray(req.language)) languages = req.language;
  else if (typeof req.language === 'string') {
    try { languages = JSON.parse(req.language); } catch { languages = req.language.split(',').map((s) => s.trim()).filter(Boolean); }
  }

  let availability = [];
  if (Array.isArray(req.availability)) availability = req.availability;
  else if (typeof req.availability === 'string') {
    try { availability = JSON.parse(req.availability); } catch { availability = req.availability.split(',').map((s) => s.trim()).filter(Boolean); }
  }

  let files = req.files || {};
  if (typeof files === 'string') {
    try { files = JSON.parse(files); } catch { files = {}; }
  }

  const submittedAt = req.submittedAt
    ? new Date(req.submittedAt).getTime()
    : req.createdAt
    ? new Date(req.createdAt).getTime()
    : Date.now();

  const id = String(req.id || req.staffId);

  return {
    id,
    staffId: req.staffId || id,
    name: u.name || req.name || 'Staff Member',
    phone: u.phone || req.phone || '',
    email: u.email || req.email || '',
    role: req.qualification || req.role || 'Caregiver',
    qualification: req.qualification || '',
    experience: req.experience || 0,
    city: (req.city || 'mumbai').toLowerCase().trim(),
    area: req.area || '',
    address: req.address || '',
    regNo: req.regNo || '',
    dob: req.dob || '',
    gender: req.gender || '',
    applied: true,
    approval: req.approval || 'pending',
    docs: req.docs || 'pending',
    docChecks: req.docChecks || {},
    skillList: skills,
    skills,
    languages,
    availability,
    emergency: {
      name: req.emergencyName || '',
      phone: req.emergencyPhone || '',
      relation: req.emergencyRelation || '',
    },
    files,
    submittedAt,
    createdAt: req.createdAt ? new Date(req.createdAt).getTime() : submittedAt,
    notes: req.notes || '',
    raw: req,
  };
};

  const applications = useCallback(
    () => {
      if (backendStaffRequests && backendStaffRequests.length > 0) {
        return backendStaffRequests
          .map(normalizeStaffRequest)
          .filter(Boolean)
          .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      }
      return [];
    },
    [backendStaffRequests]
  );

  const enqAll = useCallback(
    () =>
      Object.values(data.enquiries || {}).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      ),
    [data.enquiries]
  );

  const notesFor = useCallback(
    (to = 'admin') =>
      Object.values(data.notifications || {})
        .filter((n) => n.to === to)
        .sort((a, b) => b.at - a.at),
    [data.notifications]
  );

  const unread = useCallback(
    (to = 'admin') => notesFor(to).filter((n) => !n.read).length,
    [notesFor]
  );

  const settings = useCallback(() => data.settings?.app || {}, [data.settings]);

  // Async Thunks for Backend Integration
  const fetchStaffRequests = useCallback(
    (params) => dispatch(fetchStaffRequestsThunk(params)),
    [dispatch]
  );

  const approveStaff = useCallback(
    (id, payload) => dispatch(approveStaffThunk({ id, payload })),
    [dispatch]
  );

  const rejectStaff = useCallback(
    (id, payload) => dispatch(rejectStaffThunk({ id, payload })),
    [dispatch]
  );

  const fetchClients = useCallback(
    (params) => dispatch(fetchClientsThunk(params)),
    [dispatch]
  );

  const fetchDashboard = useCallback(
    (city = 'all') => dispatch(fetchDashboardThunk(city)),
    [dispatch]
  );

  const fetchBookings = useCallback(
    (params = '') => dispatch(fetchBookingsThunk(params)),
    [dispatch]
  );

  const fetchBookingById = useCallback(
    (id) => dispatch(fetchBookingByIdThunk(id)),
    [dispatch]
  );

  const fetchCities = useCallback(
    (params = '') => dispatch(fetchCitiesThunk(params)),
    [dispatch]
  );

  const getCityById = useCallback(
    (id) => dispatch(getCityByIdThunk(id)),
    [dispatch]
  );

  const createCity = useCallback(
    (cityData) => dispatch(createCityThunk(cityData)),
    [dispatch]
  );

  const updateCity = useCallback(
    (id, cityData) => dispatch(updateCityThunk({ id, data: cityData })),
    [dispatch]
  );

  const toggleCityStatus = useCallback(
    (id, payload = {}) => dispatch(toggleCityStatusThunk({ id, payload })),
    [dispatch]
  );

  const deleteCity = useCallback(
    (id) => dispatch(deleteCityThunk(id)),
    [dispatch]
  );

  return {
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
    syncExternalData,
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
    settings,
    // Backend API Thunk Triggers
    backendStaffRequests,
    backendClients,
    dashboardData,
    dashboardLoading,
    dashboardError,
    backendBookings,
    bookingsPagination,
    bookingsLoading,
    bookingsError,
    currentBookingDetail,
    bookingDetailLoading,
    bookingDetailError,
    backendCities,
    citiesSummary,
    citiesLoading,
    citiesError,
    cityActionLoading,
    cityActionError,
    dataLoading,
    dataError,
    fetchStaffRequests,
    approveStaff,
    rejectStaff,
    fetchClients,
    fetchDashboard,
    fetchBookings,
    fetchBookingById,
    fetchCities,
    getCityById,
    createCity,
    updateCity,
    toggleCityStatus,
    deleteCity,
  };
}
