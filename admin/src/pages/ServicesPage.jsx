import React from 'react';
import { Services } from '../components/admin/Services';
import { useUI } from '../context/UIContext';

export function ServicesPage() {
  const { showToast } = useUI();

  return <Services onShowToast={showToast} />;
}
