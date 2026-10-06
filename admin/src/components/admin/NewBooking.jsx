import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import {
  RELATIONS,
  SLOTS,
  priceLabel,
  todayISO,
  digits,
  fmtDate,
  DEFAULT_CITIES
} from '../../constants/data';

export function NewBooking({ onBack, onBookingCreated, fromEnqId }) {
  const {
    selectedCity,
    cities,
    services,
    catsAll,
    svcInCat,
    svc,
    data,
    put,
    patch,
    notify,
    staffCanConfirm,
    staffList
  } = useStore();

  const enq = fromEnqId ? data.enquiries[fromEnqId] : null;

  const [form, setForm] = useState(() => {
    const defaultCity =
      enq?.city || (selectedCity !== 'all' ? selectedCity : cities()[0]?.id || DEFAULT_CITIES[0].id);
    const initialSvc = enq?.recommended && data.services[enq.recommended]
      ? enq.recommended
      : services()[0]?.id || '';
    const initialPlan = svc(initialSvc).options?.[0] || 'Single visit';

    return {
      clientName: enq?.clientName || '',
      clientPhone: enq?.clientPhone || '',
      source: enq ? 'App' : 'Call',
      city: defaultCity,
      patientName: '',
      patientAge: enq?.patientAge || '',
      relation: 'Mother',
      service: initialSvc,
      plan: initialPlan,
      date: todayISO(),
      time: SLOTS[1] || '9:00 AM',
      address: enq?.address || '',
      notes: enq?.description || '',
      err: ''
    };
  });

  const selectedServiceObj = svc(form.service);

  const handleServiceChange = (sid) => {
    const sObj = svc(sid);
    const firstPlan = sObj.options?.[0] || 'Single visit';
    setForm((prev) => ({
      ...prev,
      service: sid,
      plan: firstPlan
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const p = digits(form.clientPhone);

    if (
      !form.clientName.trim() ||
      p.length !== 10 ||
      !form.patientName.trim() ||
      !form.address.trim() ||
      !form.date
    ) {
      setForm((prev) => ({
        ...prev,
        err: 'Please fill in client name, a 10-digit mobile number, patient name, date and address.'
      }));
      return;
    }

    const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const code = 'ELD-' + String(Date.now()).slice(-5);
    const now = Date.now();
    const sObj = svc(form.service);

    put('bookings', id, {
      code,
      city: form.city,
      serviceName: sObj.name,
      clientName: form.clientName.trim(),
      clientPhone: p,
      patientName: form.patientName.trim(),
      patientAge: form.patientAge.trim(),
      relation: form.relation,
      service: form.service,
      plan: form.plan,
      date: form.date,
      time: form.time,
      address: form.address.trim(),
      notes: form.notes.trim(),
      source: form.source,
      status: 'confirmed',
      staffId: '',
      confirmedBy: 'admin',
      confirmedAt: now,
      history: [
        { status: 'requested', at: now, by: 'admin' },
        { status: 'confirmed', at: now, by: 'admin' }
      ],
      createdAt: now
    });

    if (fromEnqId && data.enquiries[fromEnqId]) {
      const eDoc = data.enquiries[fromEnqId];
      patch('enquiries', eDoc.id, {
        status: 'converted',
        bookingId: id,
        recommended: form.service,
        history: (eDoc.history || []).concat([
          { status: 'converted', at: now, by: 'admin', note: `Booking ${code} created` }
        ])
      });
    }

    if (staffCanConfirm()) {
      staffList()
        .filter((st) => (st.city || DEFAULT_CITIES[0].id) === form.city)
        .forEach((st) =>
          notify(
            'staff:' + st.id,
            'Open visit ' + code,
            `${sObj.name} for ${form.patientName.trim()} · ${fmtDate(form.date)}, ${
              form.time
            } · needs caregiver`,
            id
          )
        );
    }

    notify(
      'client:' + p,
      'Booking confirmed',
      `Your ${sObj.name} booking ${code} is confirmed for ${fmtDate(form.date)}, ${form.time}.`,
      id
    );

    onBookingCreated(id, code);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
          aria-label="Back"
        >
          <Icon name="back" size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">New booking</h1>
          <p className="text-xs text-slate-500 font-medium">
            {enq
              ? `Creating direct booking from help request ${enq.code}`
              : 'Log requests received over phone, WhatsApp or walk-in'}
          </p>
        </div>
      </div>

      {enq && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
          <b>Converting Help Request:</b> The request {enq.code} will be marked as Booked and the
          family will receive automated notification with booking code.
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Client Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Client full name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Client Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Client mobile (10 digits) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
              placeholder="9820012345"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Request Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Request came via
            </label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {['Call', 'WhatsApp', 'App', 'Walk-in'].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">City hub</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {cities().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Patient Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.patientName}
              onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              placeholder="e.g. Savita Sharma"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Patient Age & Relation */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={form.patientAge}
                onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
                placeholder="72"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Relation</label>
              <select
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Care service <span className="text-teal-600">({priceLabel(selectedServiceObj)})</span>
            </label>
            <select
              value={form.service}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {catsAll().map((c) => {
                const list = svcInCat(c.id, false);
                if (list.length === 0) return null;
                return (
                  <optgroup key={c.id} label={c.name}>
                    {list.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Plan / Option */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Plan / Shift option</label>
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {(selectedServiceObj.options || ['Single visit']).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Visit date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Preferred slot</label>
            <select
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Full Address */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Full address &amp; Landmark <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Flat 402, Sea Green Apts, Juhu Tara Road, Juhu"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Care Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Care notes &amp; Medical condition
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Bedridden post-hip surgery, needs vital checks and mobility support."
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {form.err && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            {form.err}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
          >
            Create confirmed booking
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
