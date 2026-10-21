import React from 'react';
import { useAuth } from '../store/hooks';
import { DEFAULT_ADMIN_USER } from '../store/slices/authSlice';

export { useAuth, DEFAULT_ADMIN_USER };

export function AuthProvider({ children }) {
  return <>{children}</>;
}

export default AuthProvider;
