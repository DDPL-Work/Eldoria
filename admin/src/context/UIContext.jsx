import React from 'react';
import { useUI } from '../store/hooks';

export { useUI };

export function UIProvider({ children }) {
  return <>{children}</>;
}

export default UIProvider;
