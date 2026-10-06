import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NewBooking } from '../components/admin/NewBooking';
import { useUI } from '../context/UIContext';

export function NewBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromEnqId = searchParams.get('fromEnq');
  const { showToast } = useUI();

  return (
    <NewBooking
      fromEnqId={fromEnqId}
      onBack={() => navigate('/bookings')}
      onBookingCreated={(newId, code) => {
        showToast(`Booking ${code} created`);
        navigate(`/bookings/${newId}`);
      }}
    />
  );
}
