import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { FileProvider } from './context/FileContext';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <FileProvider>
            <UIProvider>
              <AppRoutes />
            </UIProvider>
          </FileProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
