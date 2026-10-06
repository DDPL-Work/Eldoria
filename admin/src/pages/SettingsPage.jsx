import React from 'react';
import { Settings } from '../components/admin/Settings';
import { useUI } from '../context/UIContext';

export function SettingsPage() {
  const { showToast } = useUI();

  return <Settings onShowToast={showToast} />;
}
