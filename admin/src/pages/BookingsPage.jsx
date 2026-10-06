import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookings } from '../components/admin/Bookings';

export function BookingsPage() {
  const navigate = useNavigate();

  return (
    <Bookings
      onOpenBooking={(id) => navigate(`/bookings/${id}`)}
      onNewBooking={() => navigate('/bookings/new')}
    />
  );
}
