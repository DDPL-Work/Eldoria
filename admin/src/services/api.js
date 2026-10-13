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
  // GET /api/v1/admin/profile
  getProfile: () => api.get('/admin/profile'),

  // PATCH /api/v1/admin/edit/profile
  updateProfile: (data) => api.patch('/admin/edit/profile', data),

  // GET /api/v1/admin/staff-requests
  getStaffRequests: (params = '') => {
    let query = '';
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      query = qs ? `?${qs}` : '';
    } else if (typeof params === 'string' && params.trim()) {
      query = params.startsWith('?') ? params : `?${params}`;
    }
    return api.get(`/admin/staff-requests${query}`);
  },

  // GET /api/v1/admin/staff-requests/:id
  getStaffRequestById: (id) => api.get(`/admin/staff-requests/${id}`),

  // PATCH /api/v1/admin/staff-requests/:id/approve
  approveStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/approve`, payload),

  // PATCH /api/v1/admin/staff-requests/:id/reject
  rejectStaffRequest: (id, payload = {}) => api.patch(`/admin/staff-requests/${id}/reject`, payload),

  // GET /api/v1/admin/clients
  getClients: (params = '') => {
    let query = '';
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      query = qs ? `?${qs}` : '';
    } else if (typeof params === 'string' && params.trim()) {
      query = params.startsWith('?') ? params : `?${params}`;
    }
    return api.get(`/admin/clients${query}`);
  },

  // GET /api/v1/admin/clients/:id
  getClientById: (clientId) => api.get(`/admin/clients/${clientId}`),
};

/** ===============================System Health Check Endpoint ============================== */

export const healthAPI = {check: () => api.get('/health'),};

export default api;
