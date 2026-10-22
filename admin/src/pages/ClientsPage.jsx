import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clients } from '../components/admin/Clients';

export function ClientsPage() {
  const navigate = useNavigate();

  return <Clients onOpenClient={(id) => navigate(`/clients/${id}`)} />;
}

