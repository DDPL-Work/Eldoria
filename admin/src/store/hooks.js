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
  forgotPasswordThunk,
  verifyForgotOtpThunk,
  resetPasswordThunk,
  changePasswordThunk,
  changePhoneThunk,
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
  fetchStaffRequestByIdThunk,
  verifyStaffDocumentThunk,
  approveStaffThunk,
  requestStaffChangesThunk,
  rejectStaffThunk,
  revokeStaffDecisionThunk,
  fetchClientsThunk,
  fetchClientByIdThunk,
  fetchDashboardThunk,
  fetchBookingsThunk,
  fetchBookingByIdThunk,
  fetchAvailableStaffThunk,
  confirmBookingThunk,
  assignStaffThunk,
  unassignStaffThunk,
  updateBookingStatusThunk,
  createBookingThunk,
  fetchCitiesThunk,
  getCityByIdThunk,
  createCityThunk,
  updateCityThunk,
  toggleCityStatusThunk,
  deleteCityThunk,
  fetchServicesThunk,
  fetchServiceByIdThunk,
  createServiceThunk,
  updateServiceThunk,
  toggleServiceStatusThunk,
  reorderServicesThunk,
  deleteServiceThunk,
  updateCategoryThunk,
  toggleCategoryStatusThunk,
  deleteCategoryThunk,
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

  const forgotPassword = useCallback(
    (email) => dispatch(forgotPasswordThunk(email)),
    [dispatch]
  );

  const verifyForgotOtp = useCallback(
    ({ email, otp }) => dispatch(verifyForgotOtpThunk({ email, otp })),
    [dispatch]
  );

  const resetPassword = useCallback(
    (payload) => dispatch(resetPasswordThunk(payload)),
    [dispatch]
  );

  const changePassword = useCallback(
    (payload) => dispatch(changePasswordThunk(payload)),
    [dispatch]
  );

  const changePhone = useCallback(
    (payload) => dispatch(changePhoneThunk(payload)),
    [dispatch]
  );

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
    forgotPassword,
    verifyForgotOtp,
    resetPassword,
    changePassword,
    changePhone,
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
      if (cache[id]) return cache[id];
      // If id is a direct image URL (e.g. Cloudinary or data URL)
      if (typeof id === 'string' && (id.startsWith('http') || id.startsWith('data:'))) {
        return {
          id,
          data: id,
          url: id,
          type: 'image/jpeg',
          name: 'Document',
        };
      }
      return null;
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

export const normalizeStaffRequest = (req) => {
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
  while (typeof files === 'string') {
    try {
      const parsed = JSON.parse(files);
      if (parsed === files) break;
      files = parsed;
    } catch {
      break;
    }
  }

  // Convert array to object map if needed
  const normalizedFiles = {};
  if (Array.isArray(files)) {
    files.forEach((f, idx) => {
      if (!f) return;
      const k = f.k || f.key || f.type || `doc_${idx}`;
      normalizedFiles[k] = f;
    });
  } else if (files && typeof files === 'object') {
    Object.assign(normalizedFiles, files);
  }

  // Support key aliases
  const keyAliases = {
    id_proof: 'idProof',
    idproof: 'idProof',
    photo_id: 'idProof',
    qualification_certificate: 'qualification',
    qualificationcert: 'qualification',
    experience_letter: 'experience',
    experienceletter: 'experience',
    police_verification: 'police',
    policeverification: 'police',
  };

  Object.entries(keyAliases).forEach(([alias, target]) => {
    if (normalizedFiles[alias] && !normalizedFiles[target]) {
      normalizedFiles[target] = normalizedFiles[alias];
    }
  });

  // Ensure each entry has url, data, isImage, type, name
  Object.keys(normalizedFiles).forEach((k) => {
    let f = normalizedFiles[k];
    if (!f) return;
    if (typeof f === 'string') {
      f = { id: `doc_${k}`, data: f, url: f, name: `${k}.jpg` };
    }
    const fileUrl = f.data || f.url || '';
    const isImg =
      (f.type && f.type.startsWith('image/')) ||
      /cloudinary\.com/i.test(fileUrl) ||
      /\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?|#)/i.test(fileUrl) ||
      /\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?|#)/i.test(f.name || '') ||
      fileUrl.startsWith('data:image/');

    normalizedFiles[k] = {
      ...f,
      id: f.id || `doc_${k}`,
      data: fileUrl,
      url: fileUrl,
      name: f.name || f.filename || `${k}.jpg`,
      type: f.type || (isImg ? 'image/jpeg' : 'application/pdf'),
      isImage: isImg,
    };
  });

  let docChecks = req.docChecks || {};
  while (typeof docChecks === 'string') {
    try {
      const parsed = JSON.parse(docChecks);
      if (parsed === docChecks) break;
      docChecks = parsed;
    } catch {
      break;
    }
  }

  let appHistory = req.appHistory || [];
  while (typeof appHistory === 'string') {
    try {
      const parsed = JSON.parse(appHistory);
      if (parsed === appHistory) break;
      appHistory = parsed;
    } catch {
      break;
    }
  }

  const submittedAt = req.submittedAt
    ? new Date(req.submittedAt).getTime()
    : req.createdAt
    ? new Date(req.createdAt).getTime()
    : Date.now();

  const id = String(req.id || req.staffId);

  return {
    id,
    backendId: req.id,
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
    docChecks,
    skillList: skills,
    skills,
    languages,
    availability,
    emergency: {
      name: req.emergencyName || '',
      phone: req.emergencyPhone || '',
      relation: req.emergencyRelation || '',
    },
    files: normalizedFiles,
    appHistory,
    reviewNote: req.reviewNote || '',
    reviewedAt: req.reviewedAt ? new Date(req.reviewedAt).getTime() : null,
    approvedAt: req.approvedAt ? new Date(req.approvedAt).getTime() : null,
    rejectedAt: req.rejectedAt ? new Date(req.rejectedAt).getTime() : null,
    submittedAt,
    createdAt: req.createdAt ? new Date(req.createdAt).getTime() : submittedAt,
    notes: req.notes || '',
    raw: req,
  };
};

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
  const staffRequestsPagination = useSelector(
    (state) => state.data.staffRequestsPagination
  );
  const staffRequestsLoading = useSelector(
    (state) => state.data.staffRequestsLoading
  );
  const staffRequestsError = useSelector(
    (state) => state.data.staffRequestsError
  );
  const currentStaffRequest = useSelector(
    (state) => state.data.currentStaffRequest
  );
  const staffRequestDetailLoading = useSelector(
    (state) => state.data.staffRequestDetailLoading
  );
  const staffRequestDetailError = useSelector(
    (state) => state.data.staffRequestDetailError
  );
  const backendClients = useSelector((state) => state.data.backendClients);
  const clientsPagination = useSelector(
    (state) => state.data.clientsPagination
  );
  const currentClientDetail = useSelector(
    (state) => state.data.currentClientDetail
  );
  const clientDetailLoading = useSelector(
    (state) => state.data.clientDetailLoading
  );
  const clientDetailError = useSelector(
    (state) => state.data.clientDetailError
  );
  const backendServices = useSelector(
    (state) => state.data.backendServices
  );
  const backendCategories = useSelector(
    (state) => state.data.backendCategories
  );
  const servicesSummary = useSelector(
    (state) => state.data.servicesSummary
  );
  const servicesPagination = useSelector(
    (state) => state.data.servicesPagination
  );
  const currentServiceDetail = useSelector(
    (state) => state.data.currentServiceDetail
  );
  const servicesLoading = useSelector(
    (state) => state.data.servicesLoading
  );
  const servicesError = useSelector(
    (state) => state.data.servicesError
  );
  const serviceActionLoading = useSelector(
    (state) => state.data.serviceActionLoading
  );
  const serviceActionError = useSelector(
    (state) => state.data.serviceActionError
  );
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
  const availableStaff = useSelector((state) => state.data.availableStaff);
  const availableStaffCriteria = useSelector((state) => state.data.availableStaffCriteria);
  const availableStaffCounts = useSelector((state) => state.data.availableStaffCounts);
  const availableStaffLoading = useSelector((state) => state.data.availableStaffLoading);
  const availableStaffError = useSelector((state) => state.data.availableStaffError);
  const bookingActionLoading = useSelector((state) => state.data.bookingActionLoading);
  const bookingActionError = useSelector((state) => state.data.bookingActionError);
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
    (x) => svcLive(x) && !catOf(x.categoryId).comingSoon && !x.comingSoon,
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

  const applications = useCallback(
    () => {
      let list = [];
      if (backendStaffRequests && backendStaffRequests.length > 0) {
        list = backendStaffRequests
          .map(normalizeStaffRequest)
          .filter(Boolean);
      } else {
        list = Object.values(data.staff || {})
          .filter((s) => s.applied)
          .map((s) => ({
            ...s,
            id: String(s.id || s.staffId),
            backendId: s.id,
            staffId: s.staffId || s.id,
            applied: true,
          }));
      }

      // If currentStaffRequest exists and is not yet in the list, merge it
      if (currentStaffRequest) {
        const currNorm = normalizeStaffRequest(currentStaffRequest);
        if (currNorm) {
          const idx = list.findIndex(
            (x) => String(x.id) === String(currNorm.id) || String(x.staffId) === String(currNorm.staffId)
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...currNorm };
          } else {
            list.unshift(currNorm);
          }
        }
      }

      return list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    },
    [backendStaffRequests, currentStaffRequest, data.staff]
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

  const fetchStaffRequestById = useCallback(
    (id) => dispatch(fetchStaffRequestByIdThunk(id)),
    [dispatch]
  );

  const verifyStaffDocument = useCallback(
    (id, payload) => dispatch(verifyStaffDocumentThunk({ id, payload })),
    [dispatch]
  );

  const approveStaff = useCallback(
    (id, payload) => dispatch(approveStaffThunk({ id, payload })),
    [dispatch]
  );

  const requestStaffChanges = useCallback(
    (id, payload) => dispatch(requestStaffChangesThunk({ id, payload })),
    [dispatch]
  );

  const rejectStaff = useCallback(
    (id, payload) => dispatch(rejectStaffThunk({ id, payload })),
    [dispatch]
  );

  const revokeStaffDecision = useCallback(
    (id, payload = {}) => dispatch(revokeStaffDecisionThunk({ id, payload })),
    [dispatch]
  );

  const fetchClients = useCallback(
    (params) => dispatch(fetchClientsThunk(params)),
    [dispatch]
  );

  const fetchClientById = useCallback(
    (clientId) => dispatch(fetchClientByIdThunk(clientId)),
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

  const fetchAvailableStaff = useCallback(
    (id, params = '') => dispatch(fetchAvailableStaffThunk({ id, params })),
    [dispatch]
  );

  const confirmBooking = useCallback(
    (id, payload = {}) => dispatch(confirmBookingThunk({ id, payload })),
    [dispatch]
  );

  const assignStaff = useCallback(
    (id, staffId) => dispatch(assignStaffThunk({ id, staffId })),
    [dispatch]
  );

  const unassignStaff = useCallback(
    (id, payload = {}) => dispatch(unassignStaffThunk({ id, payload })),
    [dispatch]
  );

  const updateBookingStatus = useCallback(
    (id, payload) => dispatch(updateBookingStatusThunk({ id, payload })),
    [dispatch]
  );

  const createBooking = useCallback(
    (bookingData) => dispatch(createBookingThunk(bookingData)),
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

  const fetchServices = useCallback(
    (params = '') => dispatch(fetchServicesThunk(params)),
    [dispatch]
  );

  const fetchServiceById = useCallback(
    (id) => dispatch(fetchServiceByIdThunk(id)),
    [dispatch]
  );

  const createService = useCallback(
    (serviceData) => dispatch(createServiceThunk(serviceData)),
    [dispatch]
  );

  const updateService = useCallback(
    (id, serviceData) => dispatch(updateServiceThunk({ id, data: serviceData })),
    [dispatch]
  );

  const toggleServiceStatus = useCallback(
    (id, payload = {}) => dispatch(toggleServiceStatusThunk({ id, payload })),
    [dispatch]
  );

  const reorderServices = useCallback(
    (data) => dispatch(reorderServicesThunk(data)),
    [dispatch]
  );

  const deleteService = useCallback(
    (id) => dispatch(deleteServiceThunk(id)),
    [dispatch]
  );

  const updateCategory = useCallback(
    (category, data) => dispatch(updateCategoryThunk({ category, data })),
    [dispatch]
  );

  const toggleCategoryStatus = useCallback(
    (category, payload = {}) => dispatch(toggleCategoryStatusThunk({ category, payload })),
    [dispatch]
  );

  const deleteCategory = useCallback(
    (category) => dispatch(deleteCategoryThunk(category)),
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
    // Backend API Thunk Triggers & State
    backendStaffRequests,
    staffRequestsPagination,
    staffRequestsLoading,
    staffRequestsError,
    currentStaffRequest,
    staffRequestDetailLoading,
    staffRequestDetailError,
    backendClients,
    clientsPagination,
    currentClientDetail,
    clientDetailLoading,
    clientDetailError,
    backendServices,
    backendCategories,
    servicesSummary,
    servicesPagination,
    currentServiceDetail,
    servicesLoading,
    servicesError,
    serviceActionLoading,
    serviceActionError,
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
    availableStaff,
    availableStaffCriteria,
    availableStaffCounts,
    availableStaffLoading,
    availableStaffError,
    bookingActionLoading,
    bookingActionError,
    backendCities,
    citiesSummary,
    citiesLoading,
    citiesError,
    cityActionLoading,
    cityActionError,
    dataLoading,
    dataError,
    fetchStaffRequests,
    fetchStaffRequestById,
    verifyStaffDocument,
    approveStaff,
    requestStaffChanges,
    rejectStaff,
    revokeStaffDecision,
    fetchClients,
    fetchClientById,
    fetchDashboard,
    fetchBookings,
    fetchBookingById,
    fetchAvailableStaff,
    confirmBooking,
    assignStaff,
    unassignStaff,
    updateBookingStatus,
    createBooking,
    fetchCities,
    getCityById,
    createCity,
    updateCity,
    toggleCityStatus,
    deleteCity,
    fetchServices,
    fetchServiceById,
    createService,
    updateService,
    toggleServiceStatus,
    reorderServices,
    deleteService,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
  };
}
