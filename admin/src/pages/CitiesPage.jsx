import React from 'react';
import { Cities } from '../components/admin/Cities';
import { useUI } from '../context/UIContext';

export function CitiesPage() {
  const { showToast } = useUI();

  return <Cities onShowToast={showToast} />;
}
