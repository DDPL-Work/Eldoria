import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dataReducer, { syncExternalData } from './slices/dataSlice';
import uiReducer from './slices/uiSlice';
import filesReducer from './slices/filesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
    ui: uiReducer,
    files: filesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Sync data changes across browser tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'eldoria:data:v5' && e.newValue) {
      try {
        store.dispatch(syncExternalData(JSON.parse(e.newValue)));
      } catch (err) {
        console.warn('Storage sync failed:', err);
      }
    }
  });
}

export default store;
