/**
 * Eldoria Care Desk - Centralized API Service
 * Base URL: https://eldoria-lopd.onrender.com
 */

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'https://eldoria-lopd.onrender.com';

export const API_BASE_URL = isLocalhost
  ? '/api/v1'
  : (import.meta.env.VITE_API_BASE_URL || `${SERVER_URL}/api/v1`);

export const TOKEN_KEY = 'eldoria:admin:token';

/**
 * Get stored authentication token from sessionStorage
 */
export const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

/**
 * Set or clear authentication token in sessionStorage
 */
export const setToken = (token) => {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY); // Clean up from local
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn('Failed to update token in session storage:', e);
  }
};

/**
 * Base HTTP request helper using standard fetch
 */
export const request = async (endpoint, options = {}) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const defaultHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers: defaultHeaders,
  };

  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, config);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;
      if (typeof data === 'object' && data !== null) {
        if (typeof data.message === 'string' && data.message.trim()) {
          errorMessage = data.message;
        } else if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.name === 'SequelizeConnectionRefusedError') {
            errorMessage =
              'Database Connection Error: Backend database is offline (MySQL ECONNREFUSED on Render).';
          } else if (data.error.message && typeof data.error.message === 'string') {
            errorMessage = data.error.message;
          } else if (data.error.name && typeof data.error.name === 'string') {
            errorMessage = data.error.name;
          } else {
            errorMessage = JSON.stringify(data.error);
          }
        }
      }

      const error = new Error(errorMessage);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // If it was a network error (e.g. offline, CORS, server waking up)
    if (!err.status) {
      console.error(`API Network Error [${config.method || 'GET'} ${url}]:`, err);
    }
    throw err;
  }
};

/**
 * Helper to build URL query strings from objects or string params
 */
export const buildQuery = (params = '') => {
  if (!params) return '';
  if (typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
  }
  if (typeof params === 'string' && params.trim()) {
    return params.startsWith('?') ? params : `?${params}`;
  }
  return '';
};

/** ============================= Core HTTP Methods ===============================*/

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};


/**============================= Authentication Endpoints (Admin) =============================*/

export const authAPI = {
  // POST /api/v1/admin/login
  login: (credentials) => api.post('/admin/login', credentials),

  // POST /api/v1/admin/forgot-password
  forgotPassword: (email) => api.post('/admin/forgot-password', { email }),

  // POST /api/v1/admin/verify-otp & /api/v1/admin/forgot-password/verify
  verifyOtp: (payload) => api.post('/admin/verify-otp', payload),

  // POST /api/v1/admin/forgot-password/verify
  verifyForgotOtp: (payload) => api.post('/admin/forgot-password/verify', payload),

  // POST /api/v1/admin/reset-password
  resetPassword: (payload) => api.post('/admin/reset-password', payload),



  // GET /api/v1/admin/profile
  getProfile: () => api.get('/admin/profile'),

  // PATCH /api/v1/admin/edit/profile
  updateProfile: (data) => api.patch('/admin/edit/profile', data),

  // PATCH /api/v1/admin/change-password
  changePassword: (data) => api.patch('/admin/change-password', data),

  // PATCH /api/v1/admin/change-phone
  changePhone: (data) => api.patch('/admin/change-phone', data),
};


/**========================= Admin Operational Endpoints =============================*/

export const adminAPI = {
  // --- Profile Management ---
  // GET /api/v1/admin/profile
  getProfile: () => api.get('/admin/profile'),

  // PATCH /api/v1/admin/edit/profile
  updateProfile: (data) => api.patch('/admin/edit/profile', data),

  // --- Dashboard Metrics & Data ---
  // GET /api/v1/admin/dashboard
  getDashboardData: (params = '') => api.get(`/admin/dashboard${buildQuery(params)}`),
  

  // --------------------------------------- Bookings Management -------------------------------------
  // GET /api/v1/admin/bookings/all (fallback /admin/bookings)
  getBookings: async (params = '') => {
    const qs = buildQuery(params);
    try {
      return await api.get(`/admin/bookings/all${qs}`);
    } catch (err) {
      if (err.status === 404) {
        return await api.get(`/admin/bookings${qs}`);
      }
      throw err;
    }
  },


  // POST /api/v1/admin/booking/create
  createBooking: (data) => api.post('/admin/booking/create', data),
  // GET /api/v1/admin/booking/:id
  getBookingById: (id) => api.get(`/admin/booking/${id}`),
  // GET /api/v1/admin/booking/:id/available-staff
  getAvailableStaff: (id, params = '') => api.get(`/admin/booking/${id}/available-staff${buildQuery(params)}`),
  getAvailableStaffForBooking: (id, params = '') => api.get(`/admin/booking/${id}/available-staff${buildQuery(params)}`),
  // PATCH /api/v1/admin/booking/:id/confirm
  confirmBooking: (id, payload = {}) => api.patch(`/admin/booking/${id}/confirm`, payload),

  // PATCH /api/v1/admin/booking/:id/assign
  assignStaff: (id, payload) => api.patch(`/admin/booking/${id}/assign`, payload),
  assignStaffToBooking: (id, payload) => api.patch(`/admin/booking/${id}/assign`, payload),
  // PATCH /api/v1/admin/booking/:id/unassign
  unassignStaff: (id, payload = {}) => api.patch(`/admin/booking/${id}/unassign`, payload),
  unassignStaffFromBooking: (id, payload = {}) => api.patch(`/admin/booking/${id}/unassign`, payload),
  // PATCH /api/v1/admin/booking/:id/status
  updateBookingStatus: (id, payload) => api.patch(`/admin/booking/${id}/status`, payload),




  

  // ----------------------------------City Management CRUD ---------------------------------------
  // GET /api/v1/admin/cities
  getCities: (params = '') => api.get(`/admin/cities${buildQuery(params)}`),

  // GET /api/v1/admin/cities/:id
  getCityById: (id) => api.get(`/admin/cities/${id}`),

  // POST /api/v1/admin/cities
  createCity: (data) => api.post('/admin/cities', data),

  // PATCH /api/v1/admin/cities/:id
  updateCity: (id, data) => api.patch(`/admin/cities/${id}`, data),

  // PATCH /api/v1/admin/cities/:id/status
  toggleCityStatus: (id, payload = {}) => api.patch(`/admin/cities/${id}/status`, payload),

  // DELETE /api/v1/admin/cities/:id
  deleteCity: (id) => api.delete(`/admin/cities/${id}`),

  // --- Staff Registration Requests & Document Streaming ---
  // GET /api/v1/staff/document/view (streams inline document or download, bypassing Cloudinary ACL restrictions)
  viewStaffDocument: (params = {}) => api.get(`/staff/document/view${buildQuery(params)}`),
  getStaffDocumentViewUrl: (params = {}) => getStaffDocumentViewUrl(params),

  // GET /api/v1/admin/staff-requests
  getStaffRequests: (params = '') => api.get(`/admin/staff-requests${buildQuery(params)}`),
  // GET /api/v1/admin/staff-requests/:id
  getStaffRequestById: (id) => api.get(`/admin/staff-requests/${id}`),


  // PATCH /api/v1/admin/staff-requests/:id/verify-document
  verifyStaffDocument: (id, payload) => api.patch(`/admin/staff-requests/${id}/verify-document`, payload),

  // PATCH /api/v1/admin/staff-requests/:id/approve
  approveStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/approve`, payload),

  // PATCH /api/v1/admin/staff-requests/:id/request-changes
  requestStaffChanges: (id, payload) => api.patch(`/admin/staff-requests/${id}/request-changes`, payload),

  // PATCH /api/v1/admin/staff-requests/:id/reject
  rejectStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/reject`, payload),



  // PATCH /api/v1/admin/staff-requests/:id/revoke & /pending
  revokeStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/revoke`, payload),
  moveStaffRequestToPending: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/pending`, payload),

  // PATCH /api/v1/auth/profile/:id (updates staff/client profile, including onDuty boolean status)
  updateStaffProfile: (id, payload) => api.patch(`/auth/profile/${id}`, payload),
  toggleStaffDuty: async (id, onDuty) => {
    const payload = { onDuty: Boolean(onDuty) };
    try {
      return await api.patch(`/auth/profile/${id}`, payload);
    } catch (err) {
      if (err.status === 404) {
        return await api.patch(`/profile/${id}`, payload);
      }
      throw err;
    }
  },

  // --- Client Management ---
  // GET /api/v1/admin/clients
  getClients: (params = '') => api.get(`/admin/clients${buildQuery(params)}`),

  // GET /api/v1/admin/clients/:clientId
  getClientById: (clientId) => api.get(`/admin/clients/${clientId}`),
  getClientByClientId: (clientId) => api.get(`/admin/clients/${clientId}`),

  // --- Help requests (Enquiries) Management ---
  // GET /api/v1/admin/enquiries/all
  getEnquiries: (params = '') => enquiryAPI.getEnquiries(params),
  // GET /api/v1/admin/enquiry/:id
  getEnquiryById: (id) => enquiryAPI.getEnquiryById(id),
  // PATCH /api/v1/admin/enquiry/:id/status
  updateEnquiryStatus: (id, payload) => enquiryAPI.updateEnquiryStatus(id, payload),



  // --- Services & Categories Catalog CRUD ---

  
  // GET /api/v1/admin/services
  getServices: (params = '') => api.get(`/admin/services${buildQuery(params)}`),

  // GET /api/v1/admin/services/:id
  getServiceById: (id) => api.get(`/admin/services/${id}`),

  // POST /api/v1/admin/service/create
  createService: (data) => api.post('/admin/service/create', data),

  // PATCH /api/v1/admin/service/:id/update (also PUT /api/v1/admin/services/:id)
  updateService: (id, data) => api.patch(`/admin/service/${id}/update`, data),

  // PATCH /api/v1/admin/service/:id/status
  toggleServiceStatus: (id, payload = {}) => api.patch(`/admin/service/${id}/status`, payload),

  // PATCH /api/v1/admin/services/reorder
  reorderServices: (data) => api.patch('/admin/services/reorder', data),

  // DELETE /api/v1/admin/service/:id/delete
  deleteService: (id) => api.delete(`/admin/service/${id}/delete`),

  // POST /api/v1/admin/services/categories/create
  createCategory: (data) => api.post('/admin/services/categories/create', data),

  // PATCH /api/v1/admin/services/categories/:category
  updateCategory: (category, data) => api.patch(`/admin/services/categories/${encodeURIComponent(category)}`, data),

  // PATCH /api/v1/admin/services/categories/:category/status
  toggleCategoryStatus: (category, payload = {}) =>
    api.patch(`/admin/services/categories/${encodeURIComponent(category)}/status`, payload),

  // DELETE /api/v1/admin/services/categories/:category/delete
  deleteCategory: (category) =>
    api.delete(`/admin/services/categories/${encodeURIComponent(category)}/delete`),
};

/**========================= Dedicated Modular API Exports =============================*/

export const dashboardAPI = {
  getDashboardData: (params = '') => api.get(`/admin/dashboard${buildQuery(params)}`),
};

export const bookingAPI = {
  getBookings: async (params = '') => {
    const qs = buildQuery(params);
    try {
      return await api.get(`/admin/bookings/all${qs}`);
    } catch (err) {
      if (err.status === 404) {
        return await api.get(`/admin/bookings${qs}`);
      }
      throw err;
    }
  },
  createBooking: (data) => api.post('/admin/booking/create', data),

  getBookingById: (id) => api.get(`/admin/booking/${id}`),
  getAvailableStaff: (id, params = '') => api.get(`/admin/booking/${id}/available-staff${buildQuery(params)}`),
  getAvailableStaffForBooking: (id, params = '') => api.get(`/admin/booking/${id}/available-staff${buildQuery(params)}`),
  confirmBooking: (id, payload = {}) => api.patch(`/admin/booking/${id}/confirm`, payload),
  assignStaff: (id, payload) => api.patch(`/admin/booking/${id}/assign`, payload),
  assignStaffToBooking: (id, payload) => api.patch(`/admin/booking/${id}/assign`, payload),
  unassignStaff: (id, payload = {}) => api.patch(`/admin/booking/${id}/unassign`, payload),
  unassignStaffFromBooking: (id, payload = {}) => api.patch(`/admin/booking/${id}/unassign`, payload),
  updateBookingStatus: (id, payload) => api.patch(`/admin/booking/${id}/status`, payload),
  markDateExceededBookings: (payload = {}) => api.post('/admin/bookings/mark-date-exceeded', payload),
  getDateExceededBookings: (params = '') => api.get(`/admin/bookings/date-exceeded${buildQuery(params)}`),
  cancelAdminBooking: (id, payload) => api.patch(`/cancellation/admin/${id}`, payload),
  cancelBooking: (id, payload) => api.patch(`/cancellation/admin/${id}`, payload),
};

export const cancellationAPI = {
  cancelAdminBooking: (id, payload) => api.patch(`/cancellation/admin/${id}`, payload),
  cancelClientBooking: (id, payload) => api.patch(`/cancellation/client/${id}`, payload),
};

export const cityAPI = {
  getCities: (params = '') => api.get(`/admin/cities${buildQuery(params)}`),
  getCityById: (id) => api.get(`/admin/cities/${id}`),
  createCity: (data) => api.post('/admin/cities', data),
  updateCity: (id, data) => api.patch(`/admin/cities/${id}`, data),
  toggleCityStatus: (id, payload = {}) => api.patch(`/admin/cities/${id}/status`, payload),
  deleteCity: (id) => api.delete(`/admin/cities/${id}`),
};

/**
 * Helper to build authenticated signed URL for viewing or streaming staff documents.
 * GET /api/v1/staff/document/view (bypasses Cloudinary ACL restrictions)
 * Supports query params: url, publicId, staffId, fileKey, format, filename, download
 */
export const getStaffDocumentViewUrl = (params = {}) => {
  if (!params) return '';
  if (typeof params === 'string') {
    if (params.startsWith('http')) {
      return `${API_BASE_URL}/staff/document/view?url=${encodeURIComponent(params)}`;
    }
    return `${API_BASE_URL}/staff/document/view?publicId=${encodeURIComponent(params)}`;
  }
  const qs = buildQuery(params);
  return `${API_BASE_URL}/staff/document/view${qs}`;
};

export const staffAPI = {
  // GET /api/v1/staff/document/view
  viewStaffDocumentUrl: (params = {}) => getStaffDocumentViewUrl(params),
  viewStaffDocument: (params = {}) => api.get(`/staff/document/view${buildQuery(params)}`),
  getStaffRequests: (params = '') => api.get(`/admin/staff-requests${buildQuery(params)}`),
  getStaffRequestById: (id) => api.get(`/admin/staff-requests/${id}`),
  verifyStaffDocument: (id, payload) => api.patch(`/admin/staff-requests/${id}/verify-document`, payload),
  approveStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/approve`, payload),
  requestStaffChanges: (id, payload) => api.patch(`/admin/staff-requests/${id}/request-changes`, payload),
  rejectStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/reject`, payload),
  revokeStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/revoke`, payload),
  moveStaffRequestToPending: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/pending`, payload),
  toggleStaffCanConfirm: (staffId, payload = {}) => staffConfirmAPI.toggleStaffCanConfirm(staffId, payload),
  getStaffPermissions: (staffId) => staffConfirmAPI.getStaffPermissions(staffId),
  // PATCH /api/v1/auth/profile/:id (and alias /profile/:id) - updates profile, onDuty boolean status
  updateProfile: (id, payload) => api.patch(`/auth/profile/${id}`, payload),
  updateStaffProfile: (id, payload) => api.patch(`/auth/profile/${id}`, payload),
  toggleStaffDuty: async (id, onDuty) => {
    const payload = { onDuty: Boolean(onDuty) };
    try {
      return await api.patch(`/auth/profile/${id}`, payload);
    } catch (err) {
      if (err.status === 404) {
        return await api.patch(`/profile/${id}`, payload);
      }
      throw err;
    }
  },
};

export const staffConfirmAPI = {
  getStaffPermissions: (staffId) => api.get(`/setting/staff-confirm/${staffId}`),
  toggleStaffCanConfirm: (staffId, payload = {}) =>
    api.patch(`/setting/staff-confirm/${staffId}`, payload),
};

export const clientAPI = {
  // GET /api/v1/admin/clients
  getClients: (params = '') => api.get(`/admin/clients${buildQuery(params)}`),
  // GET /api/v1/admin/clients/:clientId
  getClientById: (clientId) => api.get(`/admin/clients/${clientId}`),
  getClientByClientId: (clientId) => api.get(`/admin/clients/${clientId}`),
};

export const serviceAPI = {
  getServices: (params = '') => api.get(`/admin/services${buildQuery(params)}`),
  getServiceById: (id) => api.get(`/admin/services/${id}`),
  createService: (data) => api.post('/admin/service/create', data),
  updateService: (id, data) => api.patch(`/admin/service/${id}/update`, data),
  toggleServiceStatus: (id, payload = {}) => api.patch(`/admin/service/${id}/status`, payload),
  reorderServices: (data) => api.patch('/admin/services/reorder', data),
  deleteService: (id) => api.delete(`/admin/service/${id}/delete`),
  createCategory: (data) => api.post('/admin/services/categories/create', data),
  updateCategory: (category, data) => api.patch(`/admin/services/categories/${encodeURIComponent(category)}`, data),
  toggleCategoryStatus: (category, payload = {}) =>
    api.patch(`/admin/services/categories/${encodeURIComponent(category)}/status`, payload),
  deleteCategory: (category) =>
    api.delete(`/admin/services/categories/${encodeURIComponent(category)}/delete`),
};

export const enquiryAPI = {
  // GET /api/v1/admin/enquiries/all (supports status/filter, city, search, page, limit)
  getEnquiries: async (params = '') => {
    const qs = buildQuery(params);
    try {
      return await api.get(`/admin/enquiries/all${qs}`);
    } catch (err) {
      if (err.status === 404) {
        return await api.get(`/admin/enquiries${qs}`);
      }
      throw err;
    }
  },

  // GET /api/v1/admin/enquiry/:id
  getEnquiryById: async (id) => {
    try {
      return await api.get(`/admin/enquiry/${id}`);
    } catch (err) {
      if (err.status === 404) {
        return await api.get(`/admin/enquiries/${id}`);
      }
      throw err;
    }
  },

  // PATCH /api/v1/admin/enquiry/:id/status
  updateEnquiryStatus: async (id, payload = {}) => {
    try {
      return await api.patch(`/admin/enquiry/${id}/status`, payload);
    } catch (err) {
      if (err.status === 404) {
        return await api.patch(`/admin/enquiry/${id}`, payload);
      }
      throw err;
    }
  },

  updateEnquiry: async (id, payload = {}) => {
    try {
      return await api.patch(`/admin/enquiry/${id}/status`, payload);
    } catch (err) {
      if (err.status === 404) {
        return await api.patch(`/admin/enquiry/${id}`, payload);
      }
      throw err;
    }
  },
};

/** ===============================System Health Check Endpoint ============================== */

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
