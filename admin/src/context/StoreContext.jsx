import React from 'react';
import { useStore } from '../store/hooks';

export { useStore };

export function StoreProvider({ children }) {
  return <>{children}</>;
}

export default StoreProvider;
