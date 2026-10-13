import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI, setToken as saveTokenStorage, getToken as getStoredToken } from '../../services/api';

const AUTH_KEY = 'eldoria:admin:auth';
const USER_KEY = 'eldoria:admin:user';

export const DEFAULT_ADMIN_USER = {
  empId: 'EMP123456',
  name: 'Admin Desk',
  role: 'Care Desk Manager',
  email: 'admin@eldoria.care',
  phone: '+91 98765 43210',
};

// Initial state from sessionStorage
const initialIsAuth = (() => {
  try {
    return (
      sessionStorage.getItem(AUTH_KEY) === 'true' ||
      localStorage.getItem(AUTH_KEY) === 'true'
    );
  } catch {
    return false;
  }
})();

const initialUser = (() => {
  try {
    const raw =
      sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

/**
 * Async Thunk: Admin Login
 * Strictly calls backend API without any dummy or demo fallback
 */
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async ({ email, password = true }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login({
        email: email.trim(),
        password: password,
      });

      if (res && (res.success || res.data?.token)) {
        const token = res.data?.token || res.token || '';
        const user = res.data?.admin || res.data?.user || {
          email: email.trim(),
          role: 'admin',
        };

        if (token) saveTokenStorage(token);
        try {
          sessionStorage.setItem(AUTH_KEY, 'true');
          sessionStorage.setItem(USER_KEY, JSON.stringify(user));
          // Clean up old localStorage
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(USER_KEY);
        } catch (e) {
          console.warn('Session storage warning:', e);
        }

        return { user, token };
      }

      throw new Error(res?.message || 'Authentication failed');
    } catch (err) {
      console.error('Login API error:', err.message);
      return rejectWithValue(
        err.message || 'Invalid credentials or server error. Login failed.'
      );
    }
  }
);

/**
 * Async Thunk: Fetch Current Admin Profile
 */
export const fetchAdminProfile = createAsyncThunk(
  'auth/fetchAdminProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authAPI.getProfile();
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch profile');
    }
  }
);

/**
 * Async Thunk: Update Profile
 */
export const updateAdminProfile = createAsyncThunk(
  'auth/updateAdminProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const res = await authAPI.updateProfile(profileData);
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: initialIsAuth,
    user: initialUser,
    token: getStoredToken(),
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = '';
      state.error = null;
      saveTokenStorage(null);
      try {
        sessionStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(USER_KEY);
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(USER_KEY);
      } catch (e) {
        console.warn('Session storage logout warning:', e);
      }
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      saveTokenStorage(action.payload);
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // loginAdmin
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      })
      // fetchAdminProfile
      .addCase(fetchAdminProfile.fulfilled, (state, action) => {
        if (action.payload) {
          const profileData = action.payload.user || action.payload.data || action.payload;
          state.user = { ...state.user, ...profileData };
        }
      })
      // updateAdminProfile
      .addCase(updateAdminProfile.fulfilled, (state, action) => {
        if (action.payload) {
          const profileData = action.payload.user || action.payload.data || action.payload;
          state.user = { ...state.user, ...profileData };
          if (action.payload.token) {
            state.token = action.payload.token;
            saveTokenStorage(action.payload.token);
          }
        }
      });
  },
});

export const { logout, setUser, setToken, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
