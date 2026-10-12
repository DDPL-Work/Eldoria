import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toastMessage, setToastMessage] = useState('');
  const [previewFileId, setPreviewFileId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('eldoria_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const clearToast = () => {
    setToastMessage('');
  };

  const openPreview = (fileId) => {
    setPreviewFileId(fileId);
  };

  const closePreview = () => {
    setPreviewFileId(null);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('eldoria_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <UIContext.Provider
      value={{
        toastMessage,
        showToast,
        clearToast,
        previewFileId,
        openPreview,
        closePreview,
        sidebarCollapsed,
        toggleSidebarCollapse,
        setSidebarCollapsed
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return ctx;
}
