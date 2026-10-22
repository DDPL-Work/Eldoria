import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClientDetail } from '../components/admin/ClientDetail';
import { useUI } from '../context/UIContext';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useUI();

  return (
    <ClientDetail
      clientId={id}
      onBack={() => navigate('/clients')}
      onShowToast={showToast}
    />
  );
}
