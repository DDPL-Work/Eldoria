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

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] shadow-2xs transition min-h-[40px]';
  const labelCls = 'block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5';

  return (
    <div className="p-4 sm:p-4 w-full space-y-4">
      {/* 1. Header: Back Button + Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
          aria-label="Back to bookings"
        >
          <Icon name="back" size={18} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          New booking
        </h1>
      </div>

      <p className="text-xs sm:text-[13px] text-slate-500 max-w-[70ch] leading-relaxed">
        Log a request that came in by phone or WhatsApp. The client sees it in their app when they
        log in with the same mobile number.
      </p>

      {enq && (
        <div className="p-3.5 rounded-xl bg-[#e4ecf7] border border-[#c3d5eb] text-[#0e2f5a] text-xs font-medium">
          Creating direct booking from help request <b>{enq.code}</b>. The request is marked as booked and the client is notified.
        </div>
      )}

      {/* 2. Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4"
      >
        {/* Form Fields: 5-column responsive grid matching reference index (4).html */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
          {/* 1. Client Name */}
          <div>
            <label className={labelCls}>Client name</label>
            <input
              type="text"
              required
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 2. Client Mobile */}
          <div>
            <label className={labelCls}>Client mobile (10 digits)</label>
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
              className={`${inputCls} font-mono`}
            />
          </div>

          {/* 3. Request came via */}
          <div>
            <label className={labelCls}>Request came via</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className={`${inputCls} cursor-pointer`}
            >
              {['Call', 'WhatsApp', 'App', 'Walk-in'].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* 4. City */}
          <div>
            <label className={labelCls}>City</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={`${inputCls} cursor-pointer`}
            >
              {cities().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Patient Name */}
          <div>
            <label className={labelCls}>Patient name</label>
            <input
              type="text"
              required
              value={form.patientName}
              onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 6. Patient Age */}
          <div>
            <label className={labelCls}>Patient age</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={form.patientAge}
              onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 7. Relation to client */}
          <div>
            <label className={labelCls}>Relation to client</label>
            <select
              value={form.relation}
              onChange={(e) => setForm({ ...form, relation: e.target.value })}
              className={`${inputCls} cursor-pointer`}
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* 8. Service */}
          <div>
            <label className={labelCls}>Service</label>
            <select
              value={form.service}
              onChange={(e) => handleServiceChange(e.target.value)}
              className={`${inputCls} cursor-pointer`}
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
            <span className="text-[11px] text-slate-500 mt-1 block">
              {priceLabel(selectedServiceObj)}
            </span>
          </div>

          {/* 9. Plan / Option */}
          <div>
            <label className={labelCls}>Plan / option</label>
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className={`${inputCls} cursor-pointer`}
            >
              {(selectedServiceObj.options || ['Single visit']).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* 10. Date */}
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 11. Time */}
          <div>
            <label className={labelCls}>Time</label>
            <select
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className={`${inputCls} cursor-pointer`}
            >
              {SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 12. Address (Full Width) */}
        <div>
          <label className={labelCls}>Address</label>
          <textarea
            required
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] shadow-2xs transition min-h-[70px]"
          />
        </div>

        {/* 13. Care Notes (Full Width) */}
        <div>
          <label className={labelCls}>Care notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] shadow-2xs transition min-h-[70px]"
          />
        </div>

        {form.err && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            {form.err}
          </div>
        )}

        {/* 14. Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
          >
            Create confirmed booking
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-4.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
