import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApplicationDetail } from '../components/admin/ApplicationDetail';
import { useUI } from '../context/UIContext';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openPreview, showToast } = useUI();

  return (
    <ApplicationDetail
      appId={id}
      onBack={() => navigate('/onboarding')}
      onPreviewFile={openPreview}
      onShowToast={showToast}
    />
  );
}
