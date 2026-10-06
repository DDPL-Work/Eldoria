import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alerts } from '../components/admin/Alerts';

export function AlertsPage() {
  const navigate = useNavigate();

  const handleNavigateTarget = (targetTab, targetId) => {
    if (targetTab === 'enquiries') {
      navigate(`/enquiries/${targetId}`);
    } else if (targetTab === 'onboarding') {
      navigate(`/onboarding/${targetId}`);
    } else if (targetTab === 'bookings') {
      navigate(`/bookings/${targetId}`);
    } else {
      navigate(`/${targetTab}`);
    }
  };

  return <Alerts onNavigateTarget={handleNavigateTarget} />;
}
