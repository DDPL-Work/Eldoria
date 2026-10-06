import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toastMessage, setToastMessage] = useState('');
  const [previewFileId, setPreviewFileId] = useState(null);

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

  return (
    <UIContext.Provider
      value={{
        toastMessage,
        showToast,
        clearToast,
        previewFileId,
        openPreview,
        closePreview
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
