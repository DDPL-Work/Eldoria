import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Onboarding } from '../components/admin/Onboarding';

export function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <Onboarding
      onOpenApplication={(id) => navigate(`/onboarding/${id}`)}
    />
  );
}
