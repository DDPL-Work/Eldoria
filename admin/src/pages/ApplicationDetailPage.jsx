import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ApplicationDetail } from '../components/admin/ApplicationDetail';
import { useUI } from '../context/UIContext';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { openPreview, showToast } = useUI();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const isStaff = location.pathname.startsWith('/staff');
      navigate(isStaff ? '/staff' : '/onboarding');
    }
  };

  return (
    <ApplicationDetail
      appId={id}
      onBack={handleBack}
      onPreviewFile={openPreview}
      onShowToast={showToast}
    />
  );
}
