import { createSlice } from '@reduxjs/toolkit';

const getInitialSidebarState = () => {
  try {
    return localStorage.getItem('eldoria_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toastMessage: '',
    previewFileId: null,
    sidebarCollapsed: getInitialSidebarState(),
  },
  reducers: {
    showToast: (state, action) => {
      state.toastMessage = action.payload;
    },
    clearToast: (state) => {
      state.toastMessage = '';
    },
    openPreview: (state, action) => {
      state.previewFileId = action.payload;
    },
    closePreview: (state) => {
      state.previewFileId = null;
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      try {
        localStorage.setItem('eldoria_sidebar_collapsed', String(state.sidebarCollapsed));
      } catch (e) {}
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = Boolean(action.payload);
      try {
        localStorage.setItem('eldoria_sidebar_collapsed', String(state.sidebarCollapsed));
      } catch (e) {}
    },
  },
});

export const {
  showToast,
  clearToast,
  openPreview,
  closePreview,
  toggleSidebarCollapse,
  setSidebarCollapsed,
} = uiSlice.actions;

export default uiSlice.reducer;
