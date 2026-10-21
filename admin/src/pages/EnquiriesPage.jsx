import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Enquiries } from '../components/admin/Enquiries';
import { useUI } from '../context/UIContext';

export function EnquiriesPage() {
  const navigate = useNavigate();
  const { showToast } = useUI();

  return (
    <Enquiries
      onOpenEnquiry={(id) => navigate(`/enquiries/${id}`)}
      onShowToast={showToast}
    />
  );
}
