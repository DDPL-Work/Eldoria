import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Enquiries } from '../components/admin/Enquiries';

export function EnquiriesPage() {
  const navigate = useNavigate();

  return (
    <Enquiries
      onOpenEnquiry={(id) => navigate(`/enquiries/${id}`)}
    />
  );
}
