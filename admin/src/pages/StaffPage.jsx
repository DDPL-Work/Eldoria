import React from 'react';
import { Staff } from '../components/admin/Staff';
import { useUI } from '../context/UIContext';

export function StaffPage() {
  const { showToast } = useUI();

  return <Staff onShowToast={showToast} />;
}
