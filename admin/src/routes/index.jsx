import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { useAuth } from '../context/AuthContext';

import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { BookingsPage } from '../pages/BookingsPage';
import { BookingDetailPage } from '../pages/BookingDetailPage';
import { NewBookingPage } from '../pages/NewBookingPage';
import { StaffPage } from '../pages/StaffPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ApplicationDetailPage } from '../pages/ApplicationDetailPage';
import { ClientsPage } from '../pages/ClientsPage';
import { CitiesPage } from '../pages/CitiesPage';
import { ServicesPage } from '../pages/ServicesPage';
import { EnquiriesPage } from '../pages/EnquiriesPage';
import { EnquiryDetailPage } from '../pages/EnquiryDetailPage';
import { AlertsPage } from '../pages/AlertsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Home Route: Redirect based on authentication */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Login Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/new" element={<NewBookingPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />

        <Route path="staff" element={<StaffPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="onboarding/:id" element={<ApplicationDetailPage />} />

        <Route path="clients" element={<ClientsPage />} />
        <Route path="cities" element={<CitiesPage />} />
        <Route path="services" element={<ServicesPage />} />

        <Route path="enquiries" element={<EnquiriesPage />} />
        <Route path="enquiries/:id" element={<EnquiryDetailPage />} />

        <Route path="alerts" element={<AlertsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
