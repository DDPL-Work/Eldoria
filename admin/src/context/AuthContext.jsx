import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const AUTH_KEY = 'eldoria:admin:auth';
const USER_KEY = 'eldoria:admin:user';

export const DEFAULT_ADMIN_USER = {
  empId: 'EMP123456',
  name: 'Admin Desk',
  role: 'Care Desk Manager',
  email: 'admin@eldoria.care',
  phone: '+91 98765 43210'
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      // If explicitly logged out, false. Otherwise default true for seamless initial dev experience
      if (stored === 'false') return false;
      return true;
    } catch {
      return true;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY);
      return storedUser ? JSON.parse(storedUser) : DEFAULT_ADMIN_USER;
    } catch {
      return DEFAULT_ADMIN_USER;
    }
  });

  const login = (empId = 'EMP123456', password = '', rememberMe = true) => {
    const adminUser = {
      ...DEFAULT_ADMIN_USER,
      empId: empId.trim() || DEFAULT_ADMIN_USER.empId,
    };
    setUser(adminUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(AUTH_KEY, 'true');
      if (rememberMe) {
        localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
      }
    } catch (e) {
      console.warn('Auth storage error:', e);
    }
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.setItem(AUTH_KEY, 'false');
    } catch (e) {
      console.warn('Auth logout error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
