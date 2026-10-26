import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { useStore } from '../../context/StoreContext';
import { clientAPI } from '../../services/api';
import {
  fmtDate,
  fmtTs,
  todayISO,
  telHref,
  waHref,
  ST,
  ACTIVE
} from '../../constants/data';

function formatClientDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

function formatBookingDate(val) {
  if (!val) return '—';
  try {
    const raw = String(val).trim();
    if (raw.toLowerCase() === 'today' || raw.toLowerCase() === 'tomorrow') {
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00');
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return String(val);
  }
}

export function ClientDetail({ clientId, onBack, onShowToast }) {
  const navigate = useNavigate();
  const { cityName, backendBookings = [] } = useStore();

  const [apiClient, setApiClient] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [copied, setCopied] = useState(false);
  const fetchedIdRef = useRef(null);

  // Directly call GET /api/v1/admin/clients/:clientId (strictly once per clientId)
  const loadClientDetails = useCallback(async (force = false) => {
    if (!clientId) return;
    if (!force && fetchedIdRef.current === String(clientId)) {
      return;
    }
    fetchedIdRef.current = String(clientId);
    setApiLoading(true);
    setApiError(null);
    try {
      const res = await clientAPI.getClientByClientId(clientId);
      const data = res?.data?.data || res?.data || res;
      setApiClient(data);
    } catch (err) {
      console.warn('Failed to fetch client via getClientByClientId:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to fetch client details';
      setApiError(msg);
    } finally {
      setApiLoading(false);
    }
  }, [clientId]);

  // Fetch client details from backend on mount or when clientId changes
  useEffect(() => {
    loadClientDetails();
  }, [loadClientDetails]);

  // Resolve client data from direct API response
  // Backend returns: { client: { ... }, patients: [ ... ], totalBookings: 2, bookings: [ ... ] }
  // OR direct client object { id, clientId, ... , bookings: [ ... ] }
  const clientObj = apiClient?.client || apiClient;
  const patientsList = Array.isArray(apiClient?.patients)
    ? apiClient.patients
    : Array.isArray(clientObj?.patients)
    ? clientObj.patients
    : [];

  const directApiBookings = Array.isArray(apiClient?.bookings)
    ? apiClient.bookings
    : Array.isArray(clientObj?.bookings)
    ? clientObj.bookings
    : [];

  const u = clientObj?.user || {};
  const firstPatient = patientsList[0] || {};

  const client = clientObj
    ? {
        id: clientObj.id,
        userId: clientObj.userId || u.id,
        clientId: clientObj.clientId || (clientObj.id ? `CLT-${clientObj.id}` : '—'),
        name: clientObj.name || u.name || clientObj.patientName || 'Client',
        email: clientObj.email || u.email || '',
        phone: clientObj.phone || u.phone || clientObj.emergencyPhone || '',
        city: clientObj.city || '',
        area: clientObj.area || '',
        address: clientObj.address || '',
        landmark: clientObj.landmark || '',
        pincode: clientObj.pincode || '',
        patientName: clientObj.patientName || firstPatient.name || '—',
        patientAge: clientObj.patientAge ? `${clientObj.patientAge} yrs` : (firstPatient.age ? `${firstPatient.age} yrs` : ''),
        patientGender: clientObj.patientGender || firstPatient.gender || '',
        relation: clientObj.relation || firstPatient.relation || 'Mother',
        patientType: clientObj.patientType || '',
        medicalConditions: clientObj.medicalConditions || '',
        mobilityStatus: clientObj.mobilityStatus || '',
        requiredService: clientObj.requiredService || directApiBookings[0]?.serviceName || 'General Care',
        preferredPlan: clientObj.preferredPlan || directApiBookings[0]?.plan || 'Single visit',
        preferredTiming: clientObj.preferredTiming || directApiBookings[0]?.time || 'Flexible',
        expectedDuration: clientObj.expectedDuration || '',
        specialInstructions: clientObj.specialInstructions || '',
        emergencyName: clientObj.emergencyContact?.name || clientObj.emergencyName || '',
        emergencyPhone: clientObj.emergencyContact?.phone || clientObj.emergencyPhone || '',
        emergencyRelation: clientObj.emergencyContact?.relation || clientObj.emergencyRelation || '',
        files: clientObj.files || {},
        source: clientObj.source || 'App',
        preferredLanguage: clientObj.preferredLanguage || 'English',
        notes: clientObj.notes || directApiBookings[0]?.notes || '',
        status: clientObj.status || (u.isActive === false ? 'inactive' : 'active'),
        createdAt: clientObj.createdAt || clientObj.submittedAt || u.createdAt,
        bookings: directApiBookings,
        patients: patientsList
      }
    : null;

  const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);

  // Combine direct API bookings and store bookings matching this client
  const matchingStoreBookings = (Array.isArray(backendBookings) ? backendBookings : []).filter((b) => {
    if (!b || !client) return false;

    // 1. Match by official client code string e.g. "ELDOCL26M0011"
    if (
      client.clientId &&
      b.clientId &&
      String(b.clientId).trim().toLowerCase() === String(client.clientId).trim().toLowerCase()
    ) {
      return true;
    }

    // 2. Match by User ID if booking stores userId as clientId
    if (
      client.userId &&
      b.clientId &&
      String(b.clientId).trim() === String(client.userId).trim()
    ) {
      return true;
    }

    // 3. Match by exact 10-digit mobile number AND client name
    const bPhone = digits(b.clientPhone);
    const cPhone = digits(client.phone);
    if (bPhone && cPhone && bPhone.length === 10 && bPhone === cPhone) {
      if (b.clientName && client.name) {
        const bName = b.clientName.trim().toLowerCase();
        const cName = client.name.trim().toLowerCase();
        return bName === cName || bName.includes(cName) || cName.includes(bName);
      }
      return true;
    }

    return false;
  });

  const seenCodes = new Set();
  const todayStr = todayISO();
  const clientBookings = [...directApiBookings, ...matchingStoreBookings]
    .map((b) => {
      if (b && b.date && b.date < todayStr && !['completed', 'cancelled'].includes(b.status)) {
        return { ...b, status: 'date_exceeded' };
      }
      return b;
    })
    .filter((b) => {
      const key = b.code || b.id;
      if (!key || seenCodes.has(key)) return false;
      seenCodes.add(key);
      return true;
    });

  const activeBookingsCount = clientBookings.filter((b) => ACTIVE.includes(b.status)).length;
  const completedBookingsCount = clientBookings.filter((b) => b.status === 'completed').length;

  const isLoading = apiLoading;
  const currentError = apiError;

  const handleRefresh = () => {
    loadClientDetails(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast?.('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Status pill badge helper matching reference prototype
  const renderStatusPill = (status) => {
    let cls = 'bg-[#FEF5E7] text-[#9A5B07] border border-[#FADBA8]';
    if (status === 'completed') {
      cls = 'bg-[#E3F4EA] text-[#1E6B42] border border-transparent';
    } else if (status === 'confirmed' || status === 'assigned') {
      cls = 'bg-[#E4ECF7] text-[#0E2F5A] border border-transparent';
    } else if (status === 'cancelled') {
      cls = 'bg-[#FBE7E7] text-[#A12B2B] border border-transparent';
    } else if (status === 'date_exceeded') {
      cls = 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]';
    } else if (status === 'active') {
      cls = 'bg-[#E3F4EA] text-[#1E6B42] border border-transparent';
    }
    const label = ST[status]?.label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active');
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight ${cls}`}>
        {label}
      </span>
    );
  };

  // Loading state when initial detail hasn't arrived
  if (isLoading && !client) {
    return (
      <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
        >
          <Icon name="back" size={16} />
          <span>Back</span>
        </button>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <DatabaseLoader
            title="Fetching Client Details from Database..."
            subtitle="Connecting to Eldoria backend server (GET /api/v1/admin/clients/:clientId)"
          />
        </div>
      </div>
    );
  }

  // Not found fallback
  if (!client) {
    return (
      <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
        >
          <Icon name="back" size={16} />
          <span>Back</span>
        </button>
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-slate-500 font-bold text-sm shadow-2xs space-y-3">
          <p>{currentError || `Client '${clientId}' not found`}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0E2F5A] text-white text-xs font-semibold hover:bg-[#0A2342] transition cursor-pointer"
          >
            <RiRefreshLine className="text-sm" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const primaryPatientName =
    patientsList.length > 0
      ? patientsList.map((p) => p.name).filter(Boolean).join(' and ')
      : client.patientName !== '—'
      ? client.patientName
      : 'your family member';

  const defaultMsg = `Hello ${client.name}, this is the Eldoria Care at Home desk regarding your care services for ${primaryPatientName}. How can we assist you today? – Eldoria Care Desk`;

  const cleanPhone = client.phone ? String(client.phone).replace(/[^\d]/g, '').slice(-10) : '';
  const newBookingUrl = `/bookings/new?clientId=${encodeURIComponent(client.clientId || '')}&name=${encodeURIComponent(
    client.name || ''
  )}&phone=${encodeURIComponent(cleanPhone)}&city=${encodeURIComponent(
    client.city || ''
  )}&area=${encodeURIComponent(client.area || '')}`;

  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-4">
      {/* 1. Top Header Row: Back Button + Code & Client Name + Live Refresh + Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
            aria-label="Back to clients"
          >
            <Icon name="back" size={16} strokeWidth={2.4} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {client.clientId} · {client.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs select-none disabled:opacity-60"
            title="Refresh client details"
          >
            <RiRefreshLine
              className={`text-sm ${
                isLoading ? 'animate-spin text-[#0E2F5A]' : 'text-slate-600'
              }`}
            />
            <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {renderStatusPill(client.status)}
        </div>
      </div>

      {/* Non-blocking Detail Error Notice */}
      {currentError && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-600 font-bold shrink-0">⚠️ API Notice:</span>
            <span className="truncate">{currentError}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Main Split Content Layout: Left Drawer Card + Right Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Left Column (2 Cols): Details Card + Bookings History Card */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card 1: Client & Patient Details Key-Value List */}
          <section className="bg-white rounded-lg p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
            <dl className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[115px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs sm:text-[13px]">
              <dt className="text-slate-500 font-medium">Client</dt>
              <dd className="font-semibold text-slate-900">
                {client.name}
                {client.phone && (
                  <>
                    {' '}·{' '}
                    <a
                      href={telHref(client.phone)}
                      className="text-[#0E2F5A] hover:underline font-bold"
                    >
                      +91 {client.phone}
                    </a>
                  </>
                )}
                {client.email && (
                  <span className="text-slate-400 font-normal"> · {client.email}</span>
                )}
              </dd>

              <dt className="text-slate-500 font-medium">Patient</dt>
              <dd className="font-semibold text-slate-900">
                {patientsList.length > 0 ? (
                  <div className="space-y-1">
                    {patientsList.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                        <span>{p.name || '—'}</span>
                        {p.age && (
                          <span className="text-slate-500 font-normal">
                            ({p.age} yrs{p.relation ? `, ${p.relation}` : ''})
                          </span>
                        )}
                        {!p.age && p.relation && (
                          <span className="text-slate-500 font-normal">
                            ({p.relation})
                          </span>
                        )}
                        {p.totalBookings !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                            {p.totalBookings} {p.totalBookings === 1 ? 'booking' : 'bookings'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {client.patientName}
                    {client.patientAge ? `, ${client.patientAge}` : ''}
                    {client.relation ? ` (${client.relation})` : ''}
                  </>
                )}
              </dd>

              <dt className="text-slate-500 font-medium">Service</dt>
              <dd className="font-semibold text-slate-900 flex flex-wrap items-center gap-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {client.requiredService}
                </span>
                <span className="text-slate-400 font-normal">·</span>
                <span>{client.preferredPlan || 'Single visit'}</span>
              </dd>

              <dt className="text-slate-500 font-medium">Timing</dt>
              <dd className="font-semibold text-slate-900">
                {client.preferredTiming || 'Flexible'}
                {client.expectedDuration ? ` · ${client.expectedDuration}` : ''}
              </dd>

              <dt className="text-slate-500 font-medium">Area</dt>
              <dd className="font-semibold text-slate-900">
                {client.area || '—'}
              </dd>

              <dt className="text-slate-500 font-medium">City</dt>
              <dd className="font-semibold text-slate-900 capitalize">
                {cityName(client.city) || client.city || '—'}
              </dd>

              <dt className="text-slate-500 font-medium">Address</dt>
              <dd className="font-semibold text-slate-900 leading-relaxed">
                {client.address || '—'}
                {client.landmark ? `, Landmark: ${client.landmark}` : ''}
                {client.pincode ? ` - ${client.pincode}` : ''}
              </dd>

              <dt className="text-slate-500 font-medium">Care notes</dt>
              <dd className="font-semibold text-slate-900 leading-relaxed">
                {client.notes ||
                  client.specialInstructions ||
                  'The patient needs regular wellness checks, medication reminders according to the prescribed schedule, and assistance with daily routines. The caregiver should monitor general well-being, record relevant observations, and provide regular updates to the family.'}
              </dd>

              {client.medicalConditions && (
                <>
                  <dt className="text-slate-500 font-medium">Medical notes</dt>
                  <dd className="font-semibold text-slate-900">
                    {client.medicalConditions}
                  </dd>
                </>
              )}

              {client.mobilityStatus && (
                <>
                  <dt className="text-slate-500 font-medium">Mobility</dt>
                  <dd className="font-semibold text-slate-900 capitalize">
                    {client.mobilityStatus.replace(/_/g, ' ')}
                  </dd>
                </>
              )}

              <dt className="text-slate-500 font-medium">Emergency</dt>
              <dd className="font-semibold text-slate-900">
                {client.emergencyPhone ? (
                  <>
                    {client.emergencyName ? `${client.emergencyName} ` : ''}
                    {client.emergencyRelation ? `(${client.emergencyRelation}) ` : ''}
                    <a
                      href={telHref(client.emergencyPhone)}
                      className="text-[#0E2F5A] hover:underline font-bold"
                    >
                      +91 {client.emergencyPhone}
                    </a>
                  </>
                ) : (
                  '—'
                )}
              </dd>



              <dt className="text-slate-500 font-medium">Source</dt>
              <dd className="font-semibold text-slate-900">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    client.source === 'WhatsApp'
                      ? 'bg-[#E3F4EA] text-[#1E6B42]'
                      : client.source === 'Call'
                      ? 'bg-[#FEF5E7] text-[#9A5B07]'
                      : 'bg-[#E4ECF7] text-[#0E2F5A]'
                  }`}
                >
                  {client.source || 'App'}
                </span>
              </dd>




              <dt className="text-slate-500 font-medium">Language</dt>
              <dd className="font-semibold text-slate-900">
                {client.preferredLanguage || 'English'}
              </dd>

              <dt className="text-slate-500 font-medium">Registered</dt>
              <dd className="font-semibold text-slate-900">
                {formatClientDate(client.createdAt)}
              </dd>
            </dl>
          </section>

          {/* Card 2: Bookings History Card */}
          <section className="bg-white rounded-lg p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Bookings History
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                  {clientBookings.length} {clientBookings.length === 1 ? 'booking' : 'bookings'}
                </span>
              </div>

              {clientBookings.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  {activeBookingsCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {activeBookingsCount} active
                    </span>
                  )}
                  {completedBookingsCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {completedBookingsCount} completed
                    </span>
                  )}
                </div>
              )}
            </div>

            {clientBookings.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="font-bold text-slate-700 text-sm">No bookings recorded yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  This client has not placed any bookings yet. You can create a new booking for them directly.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(newBookingUrl)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0E2F5A] hover:bg-[#0A2342] text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
                >
                  <Icon name="plus" size={14} />
                  <span>Create Booking for {client.name}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clientBookings.map((b) => {
                  const staff = b.assignedStaff || {};
                  const staffUser = staff.user || {};
                  const staffName = staffUser.name || staff.name || b.staffName;
                  const staffPhone = staffUser.phone || staff.phone;

                  return (
                    <div
                      key={b.id || b.code}
                      className="rounded-lg border border-slate-200/90 bg-slate-50/30 hover:bg-white hover:border-slate-300/90 p-4 transition space-y-3 shadow-2xs"
                    >
                      {/* Booking Item Header: Code, Service, Plan & Status Pill */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-xs sm:text-[13px] text-[#0E2F5A]">
                            {b.code}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] truncate">
                            {b.serviceName || b.service}
                          </span>
                          {b.plan && (
                            <span className="text-slate-500 text-xs font-medium hidden sm:inline">
                              ({b.plan})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {renderStatusPill(b.status)}
                          <button
                            type="button"
                            onClick={() => navigate(`/bookings/${b.code || b.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E4ECF7] hover:bg-[#d4e2f2] text-[#0E2F5A] text-xs font-bold transition cursor-pointer shadow-2xs"
                            title="Open booking details"
                          >
                            <span>View</span>
                            <Icon name="chev" size={12} strokeWidth={2.4} />
                          </button>
                        </div>
                      </div>

                      {/* Detailed Metadata Grid: Day & Time prominently shown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                        {/* Day & Time Column */}
                        <div className="bg-white rounded-md p-2.5 border border-slate-200/70">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                            When (Day & Time)
                          </span>
                          <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-1 text-xs">
                            <Icon name="cal" size={13} className="text-[#0E2F5A] shrink-0" />
                            {formatBookingDate(b.date)}{b.time ? `, ${b.time}` : ''}
                          </span>
                        </div>

                        {/* Patient & Relationship */}
                        <div className="bg-white rounded-md p-2.5 border border-slate-200/70">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                            Patient / Care Receiver
                          </span>
                          <span className="font-semibold text-slate-900 truncate block mt-1 text-xs">
                            {b.patient?.name || b.patientName || '—'}{' '}
                            {(b.patient?.age || b.patientAge) ? `, ${b.patient?.age || b.patientAge} yrs` : ''}
                            {(b.patient?.relation || b.relation) ? ` (${b.patient?.relation || b.relation})` : ''}
                          </span>
                        </div>

                        {/* Assigned Staff Member */}
                        <div className="bg-white rounded-md p-2.5 border border-slate-200/70">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                            Assigned Staff
                          </span>
                          <span className="truncate block mt-1 text-xs">
                            {staffName ? (
                              <span className="text-emerald-700 font-bold">
                                {staffName} {staffPhone ? `· +91 ${staffPhone}` : ''}
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium">Pending Assignment</span>
                            )}
                          </span>
                        </div>

                        {/* Area & City Location */}
                        <div className="bg-white rounded-md p-2.5 border border-slate-200/70">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                            Area & City
                          </span>
                          <span className="font-semibold text-slate-800 truncate block mt-1 text-xs capitalize">
                            {(b.area || b.patient?.area) ? `${b.area || b.patient?.area}, ` : ''}
                            {cityName(b.city || b.patient?.city) || b.city || b.patient?.city || '—'}
                          </span>
                        </div>

                        {/* Booking Estimate */}
                        <div className="bg-white rounded-md p-2.5 border border-slate-200/70">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                            Estimate / Price
                          </span>
                          <span className="font-bold text-slate-900 block mt-1 text-xs">
                            {b.price ? `₹${Number(b.price).toLocaleString('en-IN')}` : '₹0'}
                          </span>
                        </div>

                        {/* Booked Timestamp */}
                        <div className="bg-white rounded-md p-2.5 border border-slate-200/70">
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
                            Created / Booked On
                          </span>
                          <span className="text-slate-700 font-medium block mt-1 text-xs">
                            {fmtTs(b.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (1 Col): Client Overview, WhatsApp the client, Actions */}
        <div className="space-y-3">
          {/* Card 1: Client Overview & Direct Actions */}
          <div className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="text-xs sm:text-sm font-bold text-slate-900">Client overview</div>

            {/* Quick Stat Counter Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <div className="text-lg font-bold text-slate-900">{clientBookings.length}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight mt-0.5">
                  Bookings
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60">
                <div className="text-lg font-bold text-amber-800">{activeBookingsCount}</div>
                <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-tight mt-0.5">
                  Active
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
                <div className="text-lg font-bold text-emerald-800">{completedBookingsCount}</div>
                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-tight mt-0.5">
                  Done
                </div>
              </div>
            </div>

            {/* Contact Actions (Call & WhatsApp) */}
            {client.phone && (
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={telHref(client.phone)}
                  className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition shadow-2xs"
                >
                  <Icon name="phone" size={14} className="text-slate-600" />
                  <span>Call client</span>
                </a>
                <a
                  href={waHref(client.phone, defaultMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#128C4A] hover:bg-[#0e703b] text-white font-bold text-xs transition shadow-2xs"
                >
                  <Icon name="wa" size={14} className="text-white" />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}

            {/* Create New Booking for Client CTA */}
            <button
              type="button"
              onClick={() => navigate(newBookingUrl)}
              className="w-full h-10 rounded-lg bg-[#0E2F5A] hover:bg-[#0A2342] text-white font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Icon name="plus" size={14} />
              <span>Create new booking</span>
            </button>
          </div>

          {/* Card 2: WhatsApp the client (Matching Image 2 directly) */}
          <div className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="text-xs sm:text-sm font-bold text-slate-900">WhatsApp the client</div>
            <div className="p-3 rounded-xl bg-[#F0F4F9] text-[11px] sm:text-xs text-slate-600 font-normal leading-relaxed">
              {defaultMsg}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={waHref(client.phone, defaultMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#128C4A] hover:bg-[#0e703b] text-white font-bold text-xs transition shadow-2xs"
              >
                <Icon name="wa" size={14} />
                <span>Open WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(defaultMsg)}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-2xs cursor-pointer flex items-center justify-center"
                title="Copy WhatsApp text"
              >
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Emergency / Alternate Contact if available */}
          {client.emergencyPhone && (
            <div className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="text-xs sm:text-sm font-bold text-slate-900">Emergency contact</div>
              <div className="text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900">
                  {client.emergencyName || 'Alternate contact'}
                  {client.emergencyRelation ? ` (${client.emergencyRelation})` : ''}
                </div>
                <div className="font-mono text-slate-600 text-xs">
                  +91 {client.emergencyPhone}
                </div>
              </div>
              <a
                href={telHref(client.emergencyPhone)}
                className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition shadow-2xs"
              >
                <Icon name="phone" size={13} className="text-slate-600" />
                <span>Call emergency contact</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
