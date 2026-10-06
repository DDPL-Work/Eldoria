import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EnquiryDetail } from '../components/admin/EnquiryDetail';
import { useUI } from '../context/UIContext';

export function EnquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openPreview, showToast } = useUI();

  return (
    <EnquiryDetail
      enquiryId={id}
      onBack={() => navigate('/enquiries')}
      onOpenBooking={(bid) => navigate(`/bookings/${bid}`)}
      onConvertBooking={(eid) => navigate(`/bookings/new?fromEnq=${eid}`)}
      onPreviewFile={openPreview}
      onShowToast={showToast}
    />
  );
}
