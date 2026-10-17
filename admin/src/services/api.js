/**
 * Eldoria Care Desk - Centralized API Service
 * Base URL: https://eldoria-lopd.onrender.com
 */

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'https://eldoria-lopd.onrender.com';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${SERVER_URL}/api/v1`;

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

  // --- Bookings Management ---
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

  // GET /api/v1/admin/booking/:id
  getBookingById: (id) => api.get(`/admin/booking/${id}`),

  // --- City Management CRUD ---
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

  // --- Staff Registration Requests ---
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

  // --- Client Management ---
  // GET /api/v1/admin/clients
  getClients: (params = '') => api.get(`/admin/clients${buildQuery(params)}`),

  // GET /api/v1/admin/clients/:id
  getClientById: (clientId) => api.get(`/admin/clients/${clientId}`),



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
  getBookingById: (id) => api.get(`/admin/booking/${id}`),
};

export const cityAPI = {
  getCities: (params = '') => api.get(`/admin/cities${buildQuery(params)}`),
  getCityById: (id) => api.get(`/admin/cities/${id}`),
  createCity: (data) => api.post('/admin/cities', data),
  updateCity: (id, data) => api.patch(`/admin/cities/${id}`, data),
  toggleCityStatus: (id, payload = {}) => api.patch(`/admin/cities/${id}/status`, payload),
  deleteCity: (id) => api.delete(`/admin/cities/${id}`),
};

export const staffAPI = {
  getStaffRequests: (params = '') => api.get(`/admin/staff-requests${buildQuery(params)}`),
  getStaffRequestById: (id) => api.get(`/admin/staff-requests/${id}`),
  verifyStaffDocument: (id, payload) => api.patch(`/admin/staff-requests/${id}/verify-document`, payload),
  approveStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/approve`, payload),
  requestStaffChanges: (id, payload) => api.patch(`/admin/staff-requests/${id}/request-changes`, payload),
  rejectStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/reject`, payload),
  revokeStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/revoke`, payload),
};

export const clientAPI = {
  getClients: (params = '') => api.get(`/admin/clients${buildQuery(params)}`),
  getClientById: (clientId) => api.get(`/admin/clients/${clientId}`),
};

export const serviceAPI = {
  getServices: (params = '') => api.get(`/admin/services${buildQuery(params)}`),
  getServiceById: (id) => api.get(`/admin/services/${id}`),
  createService: (data) => api.post('/admin/service/create', data),
  updateService: (id, data) => api.patch(`/admin/service/${id}/update`, data),
  toggleServiceStatus: (id, payload = {}) => api.patch(`/admin/service/${id}/status`, payload),
  reorderServices: (data) => api.patch('/admin/services/reorder', data),
  deleteService: (id) => api.delete(`/admin/service/${id}/delete`),
  updateCategory: (category, data) => api.patch(`/admin/services/categories/${encodeURIComponent(category)}`, data),
  toggleCategoryStatus: (category, payload = {}) =>
    api.patch(`/admin/services/categories/${encodeURIComponent(category)}/status`, payload),
  deleteCategory: (category) =>
    api.delete(`/admin/services/categories/${encodeURIComponent(category)}/delete`),
};

/** ===============================System Health Check Endpoint ============================== */

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
