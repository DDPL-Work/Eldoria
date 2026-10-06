import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { FileProvider } from './context/FileContext';
import { UIProvider } from './context/UIContext';
import { AppRoutes } from './routes';

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <FileProvider>
          <UIProvider>
            <AppRoutes />
          </UIProvider>
        </FileProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}
