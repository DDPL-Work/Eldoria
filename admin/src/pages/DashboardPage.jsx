import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '../components/admin/Dashboard';

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <Dashboard
      onTab={(tab) => navigate(`/${tab}`)}
      onOpenBooking={(id) => navigate(`/bookings/${id}`)}
      onNewBooking={() => navigate('/bookings/new')}
    />
  );
}
