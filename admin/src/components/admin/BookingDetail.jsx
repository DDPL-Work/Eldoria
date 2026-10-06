import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import {
  fmtDate,
  fmtTs,
  telHref,
  waHref,
  priceLabel,
  ST,
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
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <Icon name="back" size={16} />
          <span>Back</span>
        </button>
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 font-bold">
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

  const actorName = (actor) => {
    if (!actor || actor === 'admin') return 'Care desk';
    if (actor === 'client') return 'Family';
    if (actor.startsWith('staff:')) {
      const sid = actor.slice(6);
      return data.staff[sid]?.name || 'Staff';
    }
    return actor;
  };

  const statusLabel = ST[b.status]?.label?.toLowerCase() || b.status;
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
            aria-label="Back to bookings"
          >
            <Icon name="back" size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {b.code}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {b.clientName}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Patient: {b.patientName} ({b.relation || 'Family'})
            </p>
          </div>
        </div>

        <StatusBadge status={b.status} type="booking" />
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Details, Visit Report, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Booking Information
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Client &amp; Contact</dt>
                <dd className="font-bold text-slate-800">
                  {b.clientName} ·{' '}
                  <a
                    href={telHref(b.clientPhone)}
                    className="text-teal-700 hover:underline font-mono"
                  >
                    +91 {b.clientPhone}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Patient Details</dt>
                <dd className="font-bold text-slate-800">
                  {b.patientName}
                  {b.patientAge ? `, ${b.patientAge} yrs` : ''} ({b.relation || 'Patient'})
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Service &amp; Plan</dt>
                <dd className="font-bold text-slate-800">
                  {s.name} · <span className="text-slate-600">{b.plan}</span>
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Scheduled When</dt>
                <dd className="font-bold text-slate-800 font-mono">
                  {fmtDate(b.date)}, {b.time}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-slate-400 font-semibold mb-0.5">Address &amp; Hub</dt>
                <dd className="font-bold text-slate-800">
                  {b.address}, {cityName(bCity(b))}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-slate-400 font-semibold mb-0.5">Care notes</dt>
                <dd className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                  {b.notes || 'None provided'}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Source &amp; Estimate</dt>
                <dd className="flex items-center gap-2">
                  <StatusBadge status={b.source} type="source" />
                  <span className="font-bold text-slate-700">{priceLabel(s)}</span>
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Created</dt>
                <dd className="font-mono text-slate-700">{fmtTs(b.createdAt)}</dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Confirmed by</dt>
                <dd className="text-slate-700">
                  {b.confirmedBy ? (
                    <span>
                      {actorName(b.confirmedBy)} · {fmtTs(b.confirmedAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not yet</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold mb-0.5">Assigned by</dt>
                <dd className="text-slate-700">
                  {b.assignedBy ? (
                    <span>
                      {actorName(b.assignedBy)} · {fmtTs(b.assignedAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not yet</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Visit Report (If exists) */}
          {b.visit && (
            <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Caregiver Visit Report
              </h2>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <dt className="text-slate-400 font-semibold">Blood Pressure</dt>
                  <dd className="text-base font-black text-slate-900 mt-0.5">
                    {b.visit.bp || '—'}
                  </dd>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <dt className="text-slate-400 font-semibold">Sugar (mg/dL)</dt>
                  <dd className="text-base font-black text-slate-900 mt-0.5">
                    {b.visit.sugar || '—'}
                  </dd>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <dt className="text-slate-400 font-semibold">SpO₂ (%)</dt>
                  <dd className="text-base font-black text-slate-900 mt-0.5">
                    {b.visit.spo2 || '—'}
                  </dd>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <dt className="text-slate-400 font-semibold">Tasks Completed</dt>
                  <dd className="text-base font-black text-slate-900 mt-0.5">
                    {(b.tasks || []).filter((t) => t.done).length} / {(b.tasks || []).length}
                  </dd>
                </div>
              </dl>

              {b.visit.note && (
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Caregiver Observation Notes:</span>
                  <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                    {b.visit.note}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Status History Timeline */}
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Status History
            </h2>

            <div className="space-y-3">
              {(b.history || []).map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0 mt-1" />
                  <div className="grow">
                    <span className="font-bold text-slate-800">
                      {ST[h.status]?.label || h.status}
                    </span>{' '}
                    <span className="text-slate-400">· {actorName(h.by)}</span>
                    <div className="text-slate-400 font-mono text-[11px]">{fmtTs(h.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (1 Col): Staff Assignment & Actions */}
        <div className="space-y-6">
          {/* Assignment Box */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Assigned Staff
              </h2>
              {st && ['assigned', 'confirmed'].includes(b.status) && (
                <button
                  type="button"
                  onClick={() => unassign(b.id)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Unassign
                </button>
              )}
            </div>

            {b.assignedBy && b.assignedBy !== 'admin' && (
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 text-xs border border-blue-200">
                {b.assignedBy === 'staff:' + b.staffId ? 'Accepted' : 'Assigned'} by{' '}
                <b>{actorName(b.assignedBy)}</b> via Staff app.
              </div>
            )}

            {b.status === 'cancelled' || b.status === 'completed' ? (
              <div className="font-bold text-sm text-slate-800">
                {st ? st.name : <span className="text-slate-400">None assigned</span>}
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={b.staffId || ''}
                  onChange={(e) => assign(b.id, e.target.value, 'admin')}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="">
                    {allStaff.length
                      ? localStaff.length
                        ? 'Select caregiver to assign…'
                        : `No staff located in ${cityName(bc)}`
                      : 'Add staff first in Staff tab'}
                  </option>
                  {localStaff.length > 0 && (
                    <optgroup label={`In ${cityName(bc)}`}>
                      {localStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.role}
                          {s.onDuty ? '' : ' (off duty)'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherStaff.length > 0 && (
                    <optgroup label="Other cities">
                      {otherStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.role} ({cityName(s.city || DEFAULT_CITIES[0].id)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {st && (
              <div className="flex gap-2">
                <a
                  href={telHref(st.phone)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  <Icon name="phone" size={15} />
                  <span>Call staff</span>
                </a>
                <a
                  href={waHref(
                    st.phone,
                    `New visit ${b.code}: ${b.patientName}, ${fmtDate(b.date)} ${b.time}, ${
                      b.address
                    }. Care notes: ${b.notes || 'none'}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                >
                  <Icon name="wa" size={15} />
                  <span>Brief staff</span>
                </a>
              </div>
            )}

            {next && (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
              >
                {next[1]}
              </button>
            )}
          </section>

          {/* WhatsApp Client Messaging Box */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              WhatsApp the Client
            </h2>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 font-mono leading-relaxed">
              {msg}
            </div>
            <div className="flex gap-2">
              <a
                href={waHref(b.clientPhone, msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
              >
                <Icon name="wa" size={16} />
                <span>Open WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(msg)}
                className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Copy
              </button>
            </div>
          </section>

          {/* Cancel Booking Section */}
          {ACTIVE.includes(b.status) && (
            <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
              {confirmCancel ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-red-700">
                    Cancel this booking and notify the client and caregiver?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelBooking}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Confirm cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition cursor-pointer"
                >
                  Cancel booking
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
