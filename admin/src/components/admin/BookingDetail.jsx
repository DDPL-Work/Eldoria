import { useState, useEffect } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { useStore } from '../../context/StoreContext';
import { bookingAPI } from '../../services/api';
import {
  fmtDate,
  fmtTs,
  telHref,
  waHref,
  priceLabel,
  ST,
  FLOW,
  FLOW_TXT,
  ACTIVE,
  DEFAULT_CITIES
} from '../../constants/data';

export function BookingDetail({ bookingId, onBack, onShowToast }) {
  const {
    data,
    svcB,
    bCity,
    cityName,
    staffList,
    assign,
    unassign,
    setStatus,
    notify,
    currentBookingDetail,
    bookingDetailLoading,
    bookingDetailError,
    fetchBookingById,
    // Integrated backend booking state & actions
    availableStaff,
    availableStaffCriteria,
    availableStaffLoading,
    availableStaffError,
    bookingActionLoading,
    bookingActionError,
    fetchAvailableStaff,
    confirmBooking,
    assignStaff,
    unassignStaff,
    updateBookingStatus,
    backendStaffRequests
  } = useStore();

  const CANCEL_REASONS = [
    'Client / Family requested cancellation',
    'Caregiver unavailable / No staff in area',
    'Patient admitted to hospital / Medical emergency',
    'Duplicate or accidental booking',
    'Client unreachable / Not responding',
    'Pricing or payment issue',
    'Other reason'
  ];

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReasonPreset, setCancelReasonPreset] = useState('');
  const [cancelReasonCustom, setCancelReasonCustom] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [expandRadius, setExpandRadius] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [staffForAssignModal, setStaffForAssignModal] = useState(null);

  // Handle ESC key to smoothly close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (staffForAssignModal && !actionLoading) {
          setStaffForAssignModal(null);
        }
        if (confirmCancel && !actionLoading) {
          setConfirmCancel(false);
          setCancelError('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [staffForAssignModal, confirmCancel, actionLoading]);

  // Fetch live booking details by ID or code on mount
  useEffect(() => {
    if (bookingId) {
      fetchBookingById(bookingId);
    }
  }, [fetchBookingById, bookingId]);

  // Fetch available staff recommendations whenever booking changes or expandRadius toggles
  useEffect(() => {
    const bid = currentBookingDetail?.id || currentBookingDetail?.code || bookingId;
    if (bid) {
      fetchAvailableStaff(bid, expandRadius ? { increaseArea: true, radius: 10 } : {});
    }
  }, [currentBookingDetail?.id, currentBookingDetail?.code, bookingId, expandRadius, fetchAvailableStaff]);

  // Resolve booking: Prefer live backend details, fallback to local store
  const b =
    currentBookingDetail &&
    (String(currentBookingDetail.id) === String(bookingId) ||
      String(currentBookingDetail.code) === String(bookingId))
      ? currentBookingDetail
      : data?.bookings?.[bookingId] ||
        Object.values(data?.bookings || {}).find(
          (x) => String(x.code) === String(bookingId) || String(x.id) === String(bookingId)
        );

  // Loading state when initial detail hasn't arrived
  if (bookingDetailLoading && !b) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 w-full max-w-[1400px] mx-auto space-y-4">
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
            title="Fetching Booking Details from Database..."
            subtitle="Connecting to Eldoria backend server"
          />
        </div>
      </div>
    );
  }

  // Not found fallback
  if (!b) {
    return (
      <div className="p-4 sm:p-6 lg:p-7 w-full max-w-[1400px] mx-auto space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
        >
          <Icon name="back" size={16} />
          <span>Back</span>
        </button>
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-slate-500 font-bold text-sm shadow-2xs">
          {bookingDetailError || 'Booking not found'}
        </div>
      </div>
    );
  }

  const s = svcB(b);
  const st = b.assignedStaff
    ? {
        id: b.assignedStaff.id || b.assignedStaff.staffId,
        name: b.assignedStaff.user?.name || b.assignedStaff.name || 'Staff Member',
        phone: b.assignedStaff.user?.phone || b.assignedStaff.phone || '',
        role: b.assignedStaff.qualification || b.assignedStaff.role || 'Caregiver',
        city: b.assignedStaff.city,
        area: b.assignedStaff.area
      }
    : data?.staff?.[b.staffId];

  const safeArray = (arr) => {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr;
    if (Array.isArray(arr.matches)) return arr.matches;
    if (Array.isArray(arr.data)) return arr.data;
    if (Array.isArray(arr.staff)) return arr.staff;
    if (Array.isArray(arr.availableStaff)) return arr.availableStaff;
    if (typeof arr === 'object') {
      const vals = Object.values(arr);
      if (vals.length > 0 && typeof vals[0] === 'object') return vals;
    }
    return [];
  };

  const availableStaffList = safeArray(availableStaff);
  const backendStaffList = safeArray(backendStaffRequests);
  const allStaff = safeArray(staffList());
  const bc = b.city || bCity(b);
  const localStaff = allStaff.filter((x) => (x.city || DEFAULT_CITIES[0].id) === bc);
  const otherStaff = allStaff.filter((x) => (x.city || DEFAULT_CITIES[0].id) !== bc);

  const actorName = (by) => {
    if (!by) return '';
    if (by === 'admin') return 'Care desk (admin)';
    if (by === 'client') return 'Client';
    if (by.startsWith('staff:')) {
      const sid = by.slice(6);
      return data?.staff?.[sid]?.name || 'Staff member';
    }
    return data?.staff?.[by]?.name || by;
  };

  const statusObj = ST[b.status] || { label: b.status, cls: 'bg-[#FEF5E7] text-[#9A5B07]' };
  const statusLabel = statusObj.label.toLowerCase();

  const serviceDisplayName = b.serviceName || s?.name || b.service || 'Service';

  const msg = `Hello ${b.clientName}, your Eldoria ${serviceDisplayName} booking ${b.code} for ${
    b.patientName
  } is ${statusLabel} for ${fmtDate(b.date)} at ${b.time}.${
    st ? ` Your caregiver: ${st.name} (+91 ${st.phone}).` : ''
  } – Eldoria Care at Home`;

  const nextStepMap = {
    requested: ['confirmed', 'Confirm request'],
    confirmed: null,
    assigned: ['on_the_way', 'Mark on the way'],
    on_the_way: ['in_progress', 'Mark checked in'],
    in_progress: ['completed', 'Mark completed']
  };
  const next = nextStepMap[b.status];

  const handleAssignStaff = async (staffIdentifier) => {
    if (!staffIdentifier) return;
    const bid = b.id || b.code || bookingId;
    setActionLoading(true);
    try {
      // 1. Call backend API PATCH /api/v1/admin/booking/:id/assign
      const res = await bookingAPI.assignStaff(bid, { staffId: staffIdentifier });
      // 2. Dispatch store state
      assignStaff(bid, staffIdentifier);
      assign(b.id || bookingId, staffIdentifier, 'admin');
      // 3. Refresh live details
      await fetchBookingById(bid);
      onShowToast?.(res?.message || 'Caregiver assigned successfully');
    } catch (err) {
      console.warn('Backend assign staff error (using local fallback):', err);
      assign(b.id || bookingId, staffIdentifier, 'admin');
      onShowToast?.(`Caregiver assigned (local store)`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStaffSkillsArray = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      try {
        const parsed = JSON.parse(skills);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // comma-separated
      }
      return skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const findStaffMember = (sid) => {
    if (!sid) return null;
    const cleanId = String(sid).trim();

    // 1. Try matching recommendations list first
    const fromAvailable = availableStaffList.find(
      (x) => String(x.staffId || x.id) === cleanId
    );
    if (fromAvailable) {
      const u = fromAvailable.user || {};
      const filesObj = fromAvailable.files || {};
      return {
        id: fromAvailable.staffId || fromAvailable.id || cleanId,
        backendId: fromAvailable.id,
        name: u.name || fromAvailable.name || 'Staff Member',
        role: fromAvailable.qualification || fromAvailable.role || 'Caregiver',
        phone: u.phone || fromAvailable.phone || '',
        email: u.email || fromAvailable.email || '',
        city: fromAvailable.city || bc,
        area: fromAvailable.area || '',
        address: fromAvailable.address || '',
        regNo: fromAvailable.regNo || '',
        experience: fromAvailable.experience || 0,
        skills: fromAvailable.skills || '',
        languages: fromAvailable.languages || fromAvailable.language || '',
        docs: fromAvailable.docs || 'verified',
        onDuty: Boolean(fromAvailable.onDuty),
        score: fromAvailable.matchMeta?.matchScore || fromAvailable.score,
        photo:
          fromAvailable.photo ||
          filesObj?.photo?.url ||
          filesObj?.photo?.data ||
          u.avatar ||
          null,
        raw: fromAvailable
      };
    }

    // 2. Try backendStaffRequests
    const fromBackend = backendStaffList.find(
      (x) => String(x.staffId || x.id) === cleanId
    );
    if (fromBackend) {
      const u = fromBackend.user || {};
      const filesObj = fromBackend.files || {};
      return {
        id: fromBackend.staffId || fromBackend.id || cleanId,
        backendId: fromBackend.id,
        name: u.name || fromBackend.name || 'Staff Member',
        role: fromBackend.qualification || fromBackend.role || 'Caregiver',
        phone: u.phone || fromBackend.phone || '',
        email: u.email || fromBackend.email || '',
        city: fromBackend.city || bc,
        area: fromBackend.area || '',
        address: fromBackend.address || '',
        regNo: fromBackend.regNo || '',
        experience: fromBackend.experience || 0,
        skills: fromBackend.skills || '',
        languages: fromBackend.languages || fromBackend.language || '',
        docs: fromBackend.docs || 'verified',
        onDuty: Boolean(fromBackend.onDuty),
        photo:
          fromBackend.photo ||
          filesObj?.photo?.url ||
          filesObj?.photo?.data ||
          u.avatar ||
          null,
        raw: fromBackend
      };
    }

    // 3. Try staffList / data.staff
    const fromAll = allStaff.find(
      (x) => String(x.id || x.staffId) === cleanId
    );
    const fromStore = data?.staff?.[cleanId];
    const candidate = fromAll || fromStore;
    if (candidate) {
      const u = candidate.user || {};
      const filesObj = candidate.files || {};
      return {
        id: candidate.id || candidate.staffId || cleanId,
        backendId: candidate.backendId || candidate.id,
        name: u.name || candidate.name || 'Staff Member',
        role: candidate.qualification || candidate.role || 'Caregiver',
        phone: u.phone || candidate.phone || '',
        email: u.email || candidate.email || '',
        city: candidate.city || bc,
        area: candidate.area || '',
        address: candidate.address || '',
        regNo: candidate.regNo || '',
        experience: candidate.experience || 0,
        skills: candidate.skills || '',
        languages: candidate.languages || candidate.language || '',
        docs: candidate.docs || 'verified',
        onDuty: Boolean(candidate.onDuty),
        photo:
          candidate.photo ||
          filesObj?.photo?.url ||
          filesObj?.photo?.data ||
          u.avatar ||
          null,
        raw: candidate
      };
    }

    return {
      id: cleanId,
      name: 'Staff Member',
      role: 'Caregiver',
      city: bc
    };
  };

  const handleConfirmModalAssign = async () => {
    if (!staffForAssignModal?.id) return;
    const targetId = staffForAssignModal.id;
    await handleAssignStaff(targetId);
    setStaffForAssignModal(null);
  };

  const handleUnassignStaff = async () => {
    const bid = b.id || b.code || bookingId;
    setActionLoading(true);
    try {
      // 1. Call backend API PATCH /api/v1/admin/booking/:id/unassign
      const res = await bookingAPI.unassignStaff(bid);
      // 2. Dispatch store state
      unassignStaff(bid);
      unassign(b.id || bookingId);
      // 3. Refresh live details
      await fetchBookingById(bid);
      // 4. Re-fetch available staff pool
      fetchAvailableStaff(bid, expandRadius ? { increaseArea: true, radius: 10 } : {});
      onShowToast?.(res?.message || 'Staff unassigned successfully');
    } catch (err) {
      console.warn('Backend unassign error (using local fallback):', err);
      unassign(b.id || bookingId);
      onShowToast?.('Staff unassigned (local store)');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (!next) return;
    const [nextStatus] = next;
    const bid = b.id || b.code || bookingId;
    const extra =
      nextStatus === 'in_progress'
        ? { checkInAt: Date.now() }
        : nextStatus === 'completed'
        ? { checkOutAt: Date.now() }
        : nextStatus === 'confirmed'
        ? { confirmedBy: 'admin', confirmedAt: Date.now() }
        : {};

    setActionLoading(true);
    try {
      if (nextStatus === 'confirmed') {
        // Call backend API PATCH /api/v1/admin/booking/:id/confirm
        const res = await bookingAPI.confirmBooking(bid, { confirmedBy: 'admin' });
        confirmBooking(bid, { confirmedBy: 'admin' });
        onShowToast?.(res?.message || 'Booking confirmed');
      } else {
        // Call backend API PATCH /api/v1/admin/booking/:id/status
        const res = await bookingAPI.updateBookingStatus(bid, {
          status: nextStatus,
          note: `Status updated to ${nextStatus} by care desk`,
          ...extra,
        });
        updateBookingStatus(bid, { status: nextStatus, ...extra });
        onShowToast?.(res?.message || `Booking ${ST[nextStatus]?.label || nextStatus}`);
      }
      setStatus(b, nextStatus, extra, 'admin');
      await fetchBookingById(bid);
    } catch (err) {
      console.warn('Backend update booking status error (using local fallback):', err);
      setStatus(b, nextStatus, extra, 'admin');
      onShowToast?.(`Booking ${ST[nextStatus]?.label || nextStatus} (local store)`);
    } finally {
      setActionLoading(false);
    }

    const nextNote = {
      on_the_way: ['Caregiver on the way', 'is on the way for'],
      in_progress: ['Visit started', 'has checked in for'],
      completed: ['Visit completed', 'has completed the visit for'],
    }[nextStatus];

    if (nextNote) {
      notify(
        'client:' + (b.clientPhone || ''),
        nextNote[0],
        `${st?.name || 'Your caregiver'} ${nextNote[1]} ${b.patientName}.`,
        b.id
      );
    } else {
      notify('client:' + (b.clientPhone || ''), 'Booking confirmed', `Your booking ${b.code} is confirmed.`, b.id);
    }
  };

  const handleCancelBooking = async () => {
    const finalReason = (cancelReasonCustom.trim() || cancelReasonPreset.trim());
    if (!finalReason) {
      setCancelError('Please select or specify a cancellation reason.');
      return;
    }

    const bid = b.id || b.code || bookingId;
    setActionLoading(true);
    setCancelError('');
    try {
      // Call backend API PATCH /api/v1/admin/booking/:id/status
      const res = await bookingAPI.updateBookingStatus(bid, {
        status: 'cancelled',
        cancelReason: finalReason,
        note: finalReason,
      });
      updateBookingStatus(bid, { status: 'cancelled', cancelReason: finalReason, note: finalReason });
      setStatus(b, 'cancelled', { cancelReason: finalReason, note: finalReason }, 'admin');
      await fetchBookingById(bid);
      onShowToast?.(res?.message || `Booking cancelled: ${finalReason}`);
    } catch (err) {
      console.warn('Backend cancel booking error (using local fallback):', err);
      setStatus(b, 'cancelled', { cancelReason: finalReason, note: finalReason }, 'admin');
      onShowToast?.(`Booking cancelled: ${finalReason} (local store)`);
    } finally {
      setActionLoading(false);
      setConfirmCancel(false);
      setCancelReasonPreset('');
      setCancelReasonCustom('');
      setCancelError('');
    }

    notify(
      'client:' + (b.clientPhone || ''),
      'Booking cancelled',
      `Your booking ${b.code} was cancelled. Reason: ${finalReason}. Call us if this was unexpected.`,
      b.id
    );
    if (b.staffId) {
      notify(
        'staff:' + b.staffId,
        'Visit cancelled',
        `${b.patientName} · ${fmtDate(b.date)} was cancelled. Reason: ${finalReason}.`,
        b.id
      );
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    onShowToast?.('Message copied to clipboard');
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
    }
    const label = ST[status]?.label || status;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight ${cls}`}>
        {label}
      </span>
    );
  };

  const idx = FLOW.indexOf(b.status);
  const when = (sName) => (b.history || []).filter((h) => h.status === sName).slice(-1)[0];

  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-4">
      {/* 1. Top Header Row: Back Button + Code & Client Name + Live Refresh + Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
            aria-label="Back to bookings"
          >
            <Icon name="back" size={16} strokeWidth={2.4} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {b.code} · {b.clientName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchBookingById(bookingId)}
            disabled={bookingDetailLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs select-none disabled:opacity-60"
            title="Refresh booking details"
          >
            <RiRefreshLine
              className={`text-sm ${
                bookingDetailLoading ? 'animate-spin text-[#0E2F5A]' : 'text-slate-600'
              }`}
            />
            <span className="hidden sm:inline">{bookingDetailLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {renderStatusPill(b.status)}
        </div>
      </div>

      {/* Non-blocking Detail Error Notice */}
      {bookingDetailError && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-600 font-bold shrink-0">⚠️ API Notice:</span>
            <span className="truncate">{bookingDetailError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchBookingById(bookingId)}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Main Split Content Layout: Left Drawer Card + Right Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Left Column (2 Cols): Single Drawer Card containing Details, Visit Report, Timeline */}
        <section className="lg:col-span-2 bg-white rounded-lg p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
          {/* Key-Value Definition List */}
          <dl className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[115px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs sm:text-[13px]">
            <dt className="text-slate-500 font-medium">Client</dt>
            <dd className="font-semibold text-slate-900">
              {b.clientName} ·{' '}
              <a
                href={telHref(b.clientPhone)}
                className="text-[#0E2F5A] hover:underline font-bold"
              >
                +91 {b.clientPhone}
              </a>
            </dd>

            <dt className="text-slate-500 font-medium">Patient</dt>
            <dd className="font-semibold text-slate-900">
              {b.patientName}
              {b.patientAge ? `, ${b.patientAge}` : ''} ({b.relation || 'Self'})
            </dd>

            <dt className="text-slate-500 font-medium">Service</dt>
            <dd className="font-semibold text-slate-900">
              {serviceDisplayName} · {b.plan || 'Single visit'}
            </dd>

            <dt className="text-slate-500 font-medium">When</dt>
            <dd className="font-semibold text-slate-900">
              {fmtDate(b.date)}, {b.time}
            </dd>

            <dt className="text-slate-500 font-medium">Area</dt>
            <dd className="font-semibold text-slate-900">
              {b.area || '—'}
            </dd>

            <dt className="text-slate-500 font-medium">City</dt>
            <dd className="font-semibold text-slate-900 capitalize">
              {b.cityName || cityName(bc) || b.city || '—'}
            </dd>

            <dt className="text-slate-500 font-medium">Address</dt>
            <dd className="font-semibold text-slate-900 leading-relaxed">
              {b.address || '—'}
            </dd>

            <dt className="text-slate-500 font-medium">Care notes</dt>
            <dd className="font-semibold text-slate-900">
              {b.notes || '—'}
            </dd>

            <dt className="text-slate-500 font-medium">Source</dt>
            <dd className="font-semibold text-slate-900">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  b.source === 'WhatsApp'
                    ? 'bg-[#E3F4EA] text-[#1E6B42]'
                    : b.source === 'Call'
                    ? 'bg-[#FEF5E7] text-[#9A5B07]'
                    : 'bg-[#E4ECF7] text-[#0E2F5A]'
                }`}
              >
                {b.source || 'App'}
              </span>
            </dd>

            <dt className="text-slate-500 font-medium">Estimate</dt>
            <dd className="font-semibold text-slate-900">
              {b.price ? `₹${Number(b.price).toLocaleString('en-IN')}` : priceLabel(s)}
            </dd>

            <dt className="text-slate-500 font-medium">Created</dt>
            <dd className="font-semibold text-slate-900">
              {fmtTs(b.createdAt)}
            </dd>

            <dt className="text-slate-500 font-medium">Confirmed by</dt>
            <dd className="font-semibold text-slate-900">
              {b.confirmedBy ? (
                <span>
                  {actorName(b.confirmedBy)} · {fmtTs(b.confirmedAt)}
                </span>
              ) : (
                <span className="text-slate-400 font-normal">Not yet</span>
              )}
            </dd>

            <dt className="text-slate-500 font-medium">Assigned by</dt>
            <dd className="font-semibold text-slate-900">
              {b.assignedBy ? (
                <span>
                  {actorName(b.assignedBy)} · {fmtTs(b.assignedAt)}
                </span>
              ) : (
                <span className="text-slate-400 font-normal">Not yet</span>
              )}
            </dd>
          </dl>

          {/* Visit Report (If available) */}
          {b.visit && (
            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs sm:text-sm font-bold text-slate-900 mb-2">Visit report</div>
              <dl className="grid grid-cols-[105px_minmax(0,1fr)] sm:grid-cols-[115px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs sm:text-[13px]">
                <dt className="text-slate-500 font-medium">BP</dt>
                <dd className="font-semibold text-slate-900">{b.visit.bp || '—'}</dd>

                <dt className="text-slate-500 font-medium">Sugar</dt>
                <dd className="font-semibold text-slate-900">{b.visit.sugar || '—'}</dd>

                <dt className="text-slate-500 font-medium">SpO₂</dt>
                <dd className="font-semibold text-slate-900">{b.visit.spo2 || '—'}</dd>

                <dt className="text-slate-500 font-medium">Notes</dt>
                <dd className="font-semibold text-slate-900">{b.visit.note || '—'}</dd>

                <dt className="text-slate-500 font-medium">Tasks done</dt>
                <dd className="font-semibold text-slate-900">
                  {(b.tasks || []).filter((t) => t.done).length} of {(b.tasks || []).length}
                </dd>
              </dl>
            </div>
          )}

          {/* Status History Timeline matching reference prototype */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs sm:text-sm font-bold text-slate-900 mb-3">Status history</div>
            {b.status === 'cancelled' ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5 shadow-2xs">
                <div className="font-bold flex items-center gap-1.5 text-rose-700 text-xs sm:text-[13px]">
                  <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" />
                  <span>Booking Cancelled</span>
                </div>
                <div className="text-slate-700 leading-relaxed font-normal">
                  <span className="font-semibold text-slate-900">Reason:</span>{' '}
                  {b.cancelReason ||
                    (Array.isArray(b.history) ? b.history.find((h) => h.status === 'cancelled')?.note : '') ||
                    'Cancelled by care desk'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {FLOW.map((sName, i) => {
                  const done = i < idx || (i === idx && b.status === 'completed');
                  const cur = i === idx && !done;
                  const h = when(sName);
                  const isLast = i === FLOW.length - 1;

                  return (
                    <div key={sName} className="flex gap-2.5 items-stretch">
                      {/* Left Rail: Node + Line */}
                      <div className="flex flex-col items-center w-5 shrink-0">
                        {done ? (
                          <span className="w-5 h-5 rounded-full bg-[#1E6B42] border-2 border-[#1E6B42] flex items-center justify-center text-white shrink-0 shadow-2xs">
                            <Icon name="check" size={11} strokeWidth={3} className="text-white" />
                          </span>
                        ) : cur ? (
                          <span className="w-5 h-5 rounded-full bg-white border-[4px] border-[#F2A01F] shrink-0 shadow-2xs" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-white border-2 border-[#E1E9F4] shrink-0" />
                        )}

                        {!isLast && (
                          <span
                            className={`w-[2px] flex-1 min-h-[14px] my-0.5 ${
                              done ? 'bg-[#1E6B42]' : 'bg-[#E1E9F4]'
                            }`}
                          />
                        )}
                      </div>

                      {/* Right Text */}
                      <div className="pb-2.5 pt-0.5">
                        <div
                          className={`text-xs sm:text-[13px] font-bold leading-tight ${
                            i > idx ? 'text-slate-400 font-medium' : 'text-slate-900'
                          }`}
                        >
                          {FLOW_TXT[sName]}
                        </div>
                        {h && i <= idx && (
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {fmtTs(h.at)}
                            {h.by && h.by !== 'client' ? ` · by ${actorName(h.by)}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-4">
          {/* Card 1: Assigned Staff */}
          <div className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm font-bold text-slate-900">Assigned staff</div>
              {st && ['assigned', 'confirmed'].includes(b.status) && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleUnassignStaff}
                  className="h-6 px-2.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-[#C0392B] text-[11px] font-bold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {actionLoading && <RiRefreshLine className="animate-spin text-[10px]" />}
                  <span>Unassign</span>
                </button>
              )}
            </div>

            {b.assignedBy && b.assignedBy !== 'admin' && (
              <div className="p-2.5 rounded-lg bg-[#E4ECF7] text-[#0E2F5A] text-xs font-medium leading-relaxed">
                {b.assignedBy === 'staff:' + b.staffId ? 'Accepted' : 'Assigned'} by{' '}
                <span className="font-bold">{actorName(b.assignedBy)}</span> from the Staff app. Change
                the person below to override.
              </div>
            )}

            {st && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{st.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E4ECF7] text-[#0E2F5A]">
                    Assigned
                  </span>
                </div>
                <div className="text-slate-600 font-medium text-xs">
                  {st.role} {st.phone ? `· +91 ${st.phone}` : ''}
                </div>
                {(st.area || st.city) && (
                  <div className="text-slate-600 text-[11px] flex items-center gap-1.5 pt-1.5 border-t border-slate-200/70 font-medium">
                    <span className="text-slate-400 font-semibold">Area:</span>
                    <span className="font-bold text-slate-800">{st.area || '—'}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400 font-semibold">City:</span>
                    <span className="font-bold text-slate-800 capitalize">{cityName(st.city || bc)}</span>
                  </div>
                )}
              </div>
            )}

            {b.status === 'cancelled' || b.status === 'completed' ? (
              !st && (
                <div className="font-medium text-xs text-slate-400">
                  No staff assigned
                </div>
              )
            ) : (
              <div className="space-y-2.5">
                {/* Available Staff Recommendations from Backend API (/admin/booking/:id/available-staff) */}
                {['requested', 'confirmed', 'assigned'].includes(b.status) && (
                  <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Staff Matching API</span>
                        {availableStaffList.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#E4ECF7] text-[#0E2F5A]">
                            {availableStaffList.length} match{availableStaffList.length > 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandRadius((prev) => !prev)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          expandRadius
                            ? 'bg-[#0E2F5A] text-white border-[#0E2F5A]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Expand search area by 10 km"
                      >
                        {expandRadius ? '✓ +10 km Active' : '+10 km Radius'}
                      </button>
                    </div>

                    {availableStaffLoading ? (
                      <div className="py-2 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
                        <RiRefreshLine className="animate-spin text-sm text-[#0E2F5A]" />
                        <span>Finding matching caregivers...</span>
                      </div>
                    ) : availableStaffList.length > 0 ? (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                        {availableStaffList.slice(0, 3).map((candidate) => {
                          const cid = candidate.staffId || candidate.id;
                          const cname = candidate.user?.name || candidate.name || cid;
                          const crole = candidate.qualification || candidate.role || 'Caregiver';
                          const score = candidate.matchMeta?.matchScore || candidate.score || 85;
                          const isAssigned = String(b.staffId) === String(cid);

                          return (
                            <div
                              key={cid}
                              className={`p-2 rounded-md border text-xs flex items-center justify-between gap-2 transition ${
                                isAssigned
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'bg-white border-slate-200/80 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate">{cname}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                    {score}% match
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {crole} · {candidate.area || cityName(candidate.city || bc)}
                                  {candidate.onDuty ? ' · On duty' : ''}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={actionLoading || isAssigned}
                                onClick={() => {
                                  const staffObj = findStaffMember(cid);
                                  setStaffForAssignModal(staffObj);
                                }}
                                className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                  isAssigned
                                    ? 'bg-blue-100 text-blue-800 cursor-default'
                                    : 'bg-[#0E2F5A] hover:bg-[#0A2342] text-white disabled:opacity-50'
                                }`}
                              >
                                {isAssigned ? 'Current' : 'Assign'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-1 text-center text-[11px] text-slate-400">
                        No direct matching staff found in {cityName(bc)}. Try expanding radius.
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Dropdown Selector */}
                <select
                  value=""
                  disabled={actionLoading}
                  onChange={(e) => {
                    const sid = e.target.value;
                    if (sid) {
                      const staffObj = findStaffMember(sid);
                      setStaffForAssignModal(staffObj);
                      e.target.value = '';
                    }
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-[13px] text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#0A2342] cursor-pointer disabled:opacity-60"
                >
                  <option value="">
                    {b.staffId ? 'Change assigned staff…' : 'Select staff to assign…'}
                  </option>
                  {availableStaffList.length > 0 && (
                    <optgroup label="Recommended from Matching API">
                      {availableStaffList.map((candidate) => {
                        const cid = candidate.staffId || candidate.id;
                        const cname = candidate.user?.name || candidate.name || cid;
                        const crole = candidate.qualification || candidate.role || 'Caregiver';
                        const score = candidate.matchMeta?.matchScore || candidate.score || 85;
                        return (
                          <option key={`match-${cid}`} value={cid}>
                            ⭐ {cname} · {crole} ({score}% match)
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {localStaff.length > 0 && (
                    <optgroup label={`All in ${cityName(bc)}`}>
                      {localStaff.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name} · {person.role}
                          {person.onDuty ? '' : ' (off duty)'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherStaff.length > 0 && (
                    <optgroup label="Other cities">
                      {otherStaff.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name} · {person.role} ({cityName(person.city || DEFAULT_CITIES[0].id)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {st && (
              <div className="flex items-center gap-2 pt-0.5">
                <a
                  href={telHref(st.phone)}
                  className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition shadow-2xs"
                >
                  <Icon name="phone" size={14} />
                  <span>Call</span>
                </a>
                <a
                  href={waHref(
                    st.phone,
                    `New visit ${b.code}: ${b.patientName}, ${fmtDate(b.date)} ${b.time}, ${
                      b.address
                    }. Notes: ${b.notes || 'none'}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E6B42] hover:bg-[#175433] text-white font-bold text-xs transition shadow-2xs"
                >
                  <Icon name="wa" size={14} />
                  <span>Brief staff</span>
                </a>
              </div>
            )}

            {next && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleNextStep}
                className="w-full h-10 rounded-lg bg-[#0E2F5A] hover:bg-[#0A2342] text-white font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {actionLoading && <RiRefreshLine className="animate-spin text-sm" />}
                <span>{actionLoading ? 'Updating…' : next[1]}</span>
              </button>
            )}
          </div> 

          {/* Card 2: WhatsApp the client */}
          <div className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="text-xs sm:text-sm font-bold text-slate-900">WhatsApp the client</div>
            <div className="p-3 rounded-xl bg-[#F0F4F9] text-[11px] sm:text-xs text-slate-600 font-normal leading-relaxed">
              {msg}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={waHref(b.clientPhone, msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E6B42] hover:bg-[#175433] text-white font-bold text-xs transition shadow-2xs"
              >
                <Icon name="wa" size={15} />
                <span>Open WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(msg)}
                className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Card 3: Cancel Booking with Reason */}
          {ACTIVE.includes(b.status) &&
            (confirmCancel ? (
              <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-2xs space-y-3">
                <div className="space-y-1">
                  <div className="text-xs sm:text-[13px] font-bold text-rose-700 flex items-center gap-1.5">
                    <Icon name="x" size={14} className="text-rose-600" />
                    <span>Cancel booking with reason</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Please provide a reason. This will be recorded in the status history and sent to the client.
                  </p>
                </div>

                {/* Predefined Reasons Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Reason <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cancelReasonPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCancelReasonPreset(val);
                      if (val && val !== 'Other reason') {
                        setCancelReasonCustom(val);
                      } else if (val === 'Other reason') {
                        setCancelReasonCustom('');
                      }
                      setCancelError('');
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 cursor-pointer"
                  >
                    <option value="">-- Select cancellation reason --</option>
                    {CANCEL_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom / Detailed Reason Textarea */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Reason Details / Note{' '}
                    {cancelReasonPreset === 'Other reason' && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReasonCustom}
                    onChange={(e) => {
                      setCancelReasonCustom(e.target.value);
                      setCancelError('');
                    }}
                    placeholder="Enter specific details for client / care record..."
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 resize-none leading-relaxed placeholder-slate-400"
                  />
                </div>

                {/* Error message */}
                {cancelError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{cancelError}</p>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmCancel(false);
                      setCancelReasonPreset('');
                      setCancelReasonCustom('');
                      setCancelError('');
                    }}
                    className="flex-1 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Keep booking
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleCancelBooking}
                    className="flex-1 h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {actionLoading && <RiRefreshLine className="animate-spin text-xs" />}
                    <span>{actionLoading ? 'Cancelling…' : 'Confirm Cancel'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmCancel(true);
                  setCancelReasonPreset('');
                  setCancelReasonCustom('');
                  setCancelError('');
                }}
                className="w-full h-10 rounded-lg bg-white hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 text-rose-600 hover:text-rose-700 font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Icon name="cross" size={14} className="text-rose-600" />
                <span>Cancel booking</span>
              </button>
            ))}
        </div>
      </div>

      {/* Staff Profile & Assign Confirmation Modal */}
      {staffForAssignModal && (() => {
        const initials = staffForAssignModal?.name
          ? staffForAssignModal.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          : 'S';

        const skillsArr = getStaffSkillsArray(staffForAssignModal.skills);

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-modal-title"
            className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              margin: 0,
              zIndex: 9999,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !actionLoading) {
                setStaffForAssignModal(null);
              }
            }}
          >
            <div
              className="relative w-full max-w-5xl bg-white rounded-lg shadow-2xl border border-slate-200/90 my-auto animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-[#F2A01F]/15 border-[#F2A01F]/30 text-[#0A2342]">
                    <Icon name="user" size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h2 id="assign-modal-title" className="text-sm sm:text-base font-extrabold text-[#0A2342] leading-tight">
                      Staff Profile &amp; Assignment Confirmation
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Review caregiver details, qualifications and service area before assigning
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setStaffForAssignModal(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition text-sm font-bold disabled:opacity-50"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              {/* Booking Target Bar */}
              <div className="px-5 py-2 bg-white shrink-0 border-b border-slate-100">
                <div className="p-2 px-3 rounded-lg bg-[#EEF5FC] border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#0A2342] text-white font-extrabold text-[10px] font-mono tracking-wider shadow-2xs">
                      BOOKING {b.code}
                    </span>
                    <span className="font-extrabold text-[#0A2342] text-xs sm:text-sm">{b.patientName}</span>
                    <span className="text-slate-600 font-semibold text-xs">({serviceDisplayName})</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-medium text-xs">
                      Area: <strong className="text-slate-900">{b.area || '—'}</strong>, <span className="capitalize">{b.cityName || cityName(bc)}</span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-medium text-xs">🕒 {fmtDate(b.date)}, {b.time}</span>
                  </div>
                  {b.staffId && b.staffId !== staffForAssignModal.id && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      ⚠️ Will replace currently assigned staff
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Body - Perfectly Sized with Zero Scroll */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 overflow-hidden">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                  {/* Left Column: Photo Box + Quick Actions + Docs */}
                  <div className="w-full lg:w-[195px] shrink-0 flex flex-col justify-between space-y-2">
                    {/* Photo Container */}
                    <div className="w-full h-[145px] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative shadow-xs flex items-center justify-center group">
                      {staffForAssignModal.photo ? (
                        <img
                          src={staffForAssignModal.photo}
                          alt={staffForAssignModal.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#EBF2FA] text-[#0A2342]">
                          <span className="text-3xl font-extrabold tracking-wider">{initials}</span>
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                            Eldoria Staff
                          </span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold shadow-2xs ${
                            staffForAssignModal.onDuty
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              staffForAssignModal.onDuty ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span>{staffForAssignModal.onDuty ? 'On duty' : 'Off duty'}</span>
                        </span>
                      </div>

                      {/* Match Score */}
                      {staffForAssignModal.score && (
                        <div className="absolute bottom-2 left-2">
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-[#0A2342] text-white shadow-2xs">
                            ⭐ {staffForAssignModal.score}% Match
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Contact Buttons */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <a
                        href={telHref(staffForAssignModal.phone)}
                        className="h-8 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition shadow-2xs"
                      >
                        <Icon name="phone" size={12} />
                        <span>Call</span>
                      </a>
                      <a
                        href={waHref(
                          staffForAssignModal.phone,
                          `Hello ${staffForAssignModal.name}, Eldoria Care team here regarding visit ${b.code} for ${b.patientName}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#128C4A] hover:bg-[#0e703b] text-white font-bold text-xs transition shadow-2xs"
                      >
                        <Icon name="wa" size={12} />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {/* Duty & Doc Verification Box */}
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-center space-y-0.5">
                      <div className="font-bold text-slate-800 text-[11px]">
                        {staffForAssignModal.docs === 'verified' ? '✓ Document Verified' : '⏳ Pending Verification'}
                      </div>
                      {staffForAssignModal.regNo && (
                        <div className="font-mono text-[10px] text-slate-500">
                          Reg: {staffForAssignModal.regNo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Profile Information */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2.5">
                    {/* Header Row: Name, Role & Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-extrabold text-[#0A2342] tracking-tight truncate">
                            {staffForAssignModal.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-[#0A2342]/10 text-[#0A2342] font-bold text-xs border border-[#0A2342]/20">
                            {staffForAssignModal.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>
                            {staffForAssignModal.experience
                              ? `${staffForAssignModal.experience}+ years experience`
                              : 'Experienced Caregiver'}
                          </span>
                          {staffForAssignModal.regNo && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-slate-600">Reg: {staffForAssignModal.regNo}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          staffForAssignModal.docs === 'verified'
                            ? 'bg-[#E3F4EA] text-[#1E6B42] border border-[#1E6B42]/20'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {staffForAssignModal.docs === 'verified' ? '✓ Verified Staff' : '⏳ Verification Pending'}
                      </span>
                    </div>

                    {/* Compact Key Information Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50/70 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wide mb-0.5">Mobile Phone</span>
                        <span className="font-bold text-slate-900 font-mono text-xs">
                          +91 {staffForAssignModal.phone || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wide mb-0.5">Email Address</span>
                        <span className="font-semibold text-slate-800 text-xs truncate block" title={staffForAssignModal.email}>
                          {staffForAssignModal.email || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wide mb-0.5">Service Area</span>
                        <span className="font-bold text-slate-900 text-xs truncate block" title={staffForAssignModal.area}>
                          {staffForAssignModal.area || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wide mb-0.5">City Hub</span>
                        <span className="font-bold text-slate-900 capitalize text-xs">
                          {cityName(staffForAssignModal.city || bc)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wide mb-0.5">Qualification / Role</span>
                        <span className="font-semibold text-slate-800 text-xs truncate block">
                          {staffForAssignModal.qualification || staffForAssignModal.role || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wide mb-0.5">Registration Number</span>
                        <span className="font-mono text-slate-700 text-xs truncate block">
                          {staffForAssignModal.regNo || '—'}
                        </span>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3 pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wide mb-0.5">Full Address</span>
                        <span className="font-medium text-slate-800 text-xs leading-snug block" title={staffForAssignModal.address}>
                          {staffForAssignModal.address || `${staffForAssignModal.area || ''}, ${cityName(staffForAssignModal.city || bc)}` || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Specialized Skills & Capabilities */}
                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Specialized Skills &amp; Care Capabilities
                      </span>
                      {skillsArr.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {skillsArr.map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EEF5FC] text-[#0A2342] border border-blue-200/60 shadow-2xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">General patient care &amp; monitoring</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-5 border-t border-slate-100 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleConfirmModalAssign}
                    className="h-9 px-5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] disabled:opacity-50 text-[#0A2342] font-extrabold text-xs sm:text-sm transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    {actionLoading ? (
                      <>
                        <RiRefreshLine className="animate-spin text-sm" />
                        <span>Assigning caregiver...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={15} strokeWidth={2.8} />
                        <span>Assign Caregiver to Booking</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setStaffForAssignModal(null)}
                    className="h-9 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm transition cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium hidden sm:block">
                  Assigning to {b.code} · {b.patientName}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
