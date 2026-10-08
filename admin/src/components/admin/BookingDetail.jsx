import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
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
    notify
  } = useStore();

  const [confirmCancel, setConfirmCancel] = useState(false);

  const b = data.bookings[bookingId];

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
          Booking not found
        </div>
      </div>
    );
  }

  const s = svcB(b);
  const st = data.staff[b.staffId];
  const allStaff = staffList();
  const bc = bCity(b);
  const localStaff = allStaff.filter((x) => (x.city || DEFAULT_CITIES[0].id) === bc);
  const otherStaff = allStaff.filter((x) => (x.city || DEFAULT_CITIES[0].id) !== bc);

  const actorName = (by) => {
    if (!by) return '';
    if (by === 'admin') return 'Care desk (admin)';
    if (by === 'client') return 'Client';
    if (by.startsWith('staff:')) {
      const sid = by.slice(6);
      return data.staff[sid]?.name || 'Staff member';
    }
    return data.staff[by]?.name || by;
  };

  const statusObj = ST[b.status] || { label: b.status, cls: 'bg-[#FEF5E7] text-[#9A5B07]' };
  const statusLabel = statusObj.label.toLowerCase();

  const msg = `Hello ${b.clientName}, your Eldoria ${s.name} booking ${b.code} for ${
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

  const handleNextStep = () => {
    if (!next) return;
    const [nextStatus] = next;
    const extra =
      nextStatus === 'in_progress'
        ? { checkInAt: Date.now() }
        : nextStatus === 'completed'
        ? { checkOutAt: Date.now() }
        : nextStatus === 'confirmed'
        ? { confirmedBy: 'admin', confirmedAt: Date.now() }
        : {};

    setStatus(b, nextStatus, extra, 'admin');

    const nextNote = {
      on_the_way: ['Caregiver on the way', 'is on the way for'],
      in_progress: ['Visit started', 'has checked in for'],
      completed: ['Visit completed', 'has completed the visit for']
    }[nextStatus];

    if (nextNote) {
      notify(
        'client:' + b.clientPhone,
        nextNote[0],
        `${st?.name || 'Your caregiver'} ${nextNote[1]} ${b.patientName}.`,
        b.id
      );
    } else {
      notify('client:' + b.clientPhone, 'Booking confirmed', `Your booking ${b.code} is confirmed.`, b.id);
    }

    onShowToast?.(`Booking ${ST[nextStatus]?.label || nextStatus}`);
  };

  const handleCancelBooking = () => {
    setStatus(b, 'cancelled', { cancelReason: 'Cancelled by care desk' }, 'admin');
    notify(
      'client:' + b.clientPhone,
      'Booking cancelled',
      `Your booking ${b.code} was cancelled by the care desk. Call us if this was unexpected.`,
      b.id
    );
    if (b.staffId) {
      notify(
        'staff:' + b.staffId,
        'Visit cancelled',
        `${b.patientName} · ${fmtDate(b.date)} was cancelled.`,
        b.id
      );
    }
    setConfirmCancel(false);
    onShowToast?.('Booking cancelled');
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
      {/* 1. Top Header Row: Back Button + Code & Client Name + Status Pill */}
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

        {renderStatusPill(b.status)}
      </div>

      {/* 2. Main Split Content Layout: Left Drawer Card + Right Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Left Column (2 Cols): Single Drawer Card containing Details, Visit Report, Timeline */}
        <section className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
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
              {s.name} · {b.plan}
            </dd>

            <dt className="text-slate-500 font-medium">When</dt>
            <dd className="font-semibold text-slate-900">
              {fmtDate(b.date)}, {b.time}
            </dd>

            <dt className="text-slate-500 font-medium">Address</dt>
            <dd className="font-semibold text-slate-900">
              {b.address}, {cityName(bc)}
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
              {priceLabel(s)}
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
              <div className="p-2.5 rounded-xl bg-[#FBE7E7] text-[#A12B2B] text-xs font-bold">
                This booking was cancelled{b.cancelReason ? `: ${b.cancelReason}` : ''}.
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

        {/* Right Column: Assigned Staff, WhatsApp Client, Cancel Booking */}
        <div className="space-y-4">
          {/* Card 1: Assigned Staff */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm font-bold text-slate-900">Assigned staff</div>
              {st && ['assigned', 'confirmed'].includes(b.status) && (
                <button
                  type="button"
                  onClick={() => unassign(b.id)}
                  className="h-6 px-2.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-[#C0392B] text-[11px] font-bold transition cursor-pointer"
                >
                  Unassign
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

            {b.status === 'cancelled' || b.status === 'completed' ? (
              <div className="font-bold text-xs sm:text-[13px] text-slate-900">
                {st ? st.name : <span className="text-slate-400 font-medium">None</span>}
              </div>
            ) : (
              <select
                value={b.staffId || ''}
                onChange={(e) => assign(b.id, e.target.value, 'admin')}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-[13px] text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#0A2342] cursor-pointer"
              >
                <option value="">
                  {allStaff.length
                    ? localStaff.length
                      ? 'Assign staff…'
                      : `No staff in ${cityName(bc)}`
                    : 'Add staff first'}
                </option>
                {localStaff.length > 0 && (
                  <optgroup label={`In ${cityName(bc)}`}>
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
                onClick={handleNextStep}
                className="w-full h-10 rounded-lg bg-[#0E2F5A] hover:bg-[#0A2342] text-white font-bold text-xs sm:text-[13px] transition cursor-pointer shadow-2xs"
              >
                {next[1]}
              </button>
            )}
          </div>

          {/* Card 2: WhatsApp the client */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
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

          {/* Card 3: Cancel Booking */}
          {ACTIVE.includes(b.status) && (
            confirmCancel ? (
              <div className="bg-white rounded-2xl p-3.5 border border-red-200 shadow-2xs space-y-2.5">
                <div className="text-xs font-bold text-red-700 text-center">
                  Cancel this booking and notify the client?
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="flex-1 h-8 rounded-lg bg-[#C0392B] hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Cancel booking
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-2 border border-slate-200/90 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="w-full h-6.5 rounded-xl text-[#C0392B] hover:bg-red-50/60 font-bold text-xs transition cursor-pointer flex items-center justify-center"
                >
                  Cancel booking
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
