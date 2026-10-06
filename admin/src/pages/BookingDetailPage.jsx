import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookingDetail } from '../components/admin/BookingDetail';
import { useUI } from '../context/UIContext';

export function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useUI();

  return (
    <BookingDetail
      bookingId={id}
      onBack={() => navigate('/bookings')}
      onShowToast={showToast}
    />
  );
}
