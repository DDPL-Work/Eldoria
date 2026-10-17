import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { FormCityDropdown } from '../common/FormCityDropdown';
import { useStore } from '../../context/StoreContext';
import { bookingAPI } from '../../services/api';
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
    staffList,
    createBooking
  } = useStore();

  const enq = fromEnqId ? data.enquiries[fromEnqId] : null;

  const [customSource, setCustomSource] = useState(false);
  const [customRelation, setCustomRelation] = useState(false);
  const [customTime, setCustomTime] = useState(false);
  const [customPlan, setCustomPlan] = useState(false);

  const [form, setForm] = useState(() => {
    const defaultCity =
      enq?.city || (selectedCity !== 'all' ? selectedCity : '');
    const initialSvc = enq?.recommended && data.services[enq.recommended]
      ? enq.recommended
      : '';
    const initialPlan = enq?.plan || '';

    return {
      clientName: enq?.clientName || '',
      clientPhone: enq?.clientPhone || '',
      source: enq ? 'App' : '',
      city: defaultCity,
      area: enq?.area || '',
      patientName: '',
      patientAge: enq?.patientAge || '',
      relation: '',
      service: initialSvc,
      plan: initialPlan,
      date: todayISO(),
      time: '',
      address: enq?.address || '',
      notes: enq?.description || '',
      err: ''
    };
  });

  const selectedServiceObj = form.service ? svc(form.service) : null;

  const handleServiceChange = (sid) => {
    if (!sid) {
      setForm((prev) => ({
        ...prev,
        service: '',
        plan: ''
      }));
      setCustomPlan(false);
      return;
    }
    const sObj = svc(sid);
    const firstPlan = sObj.options?.[0] || 'Single visit';
    setForm((prev) => ({
      ...prev,
      service: sid,
      plan: firstPlan
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const p = digits(form.clientPhone);

    if (!form.clientName.trim()) {
      setForm((prev) => ({ ...prev, err: 'Please enter client name.' }));
      return;
    }
    if (p.length !== 10) {
      setForm((prev) => ({
        ...prev,
        err: 'Please enter a valid 10-digit client mobile number.'
      }));
      return;
    }
    if (!form.city.trim()) {
      setForm((prev) => ({ ...prev, err: 'Please select or enter a city.' }));
      return;
    }
    if (!form.patientName.trim()) {
      setForm((prev) => ({ ...prev, err: 'Please enter patient name.' }));
      return;
    }
    if (!form.service) {
      setForm((prev) => ({ ...prev, err: 'Please select a service.' }));
      return;
    }
    if (!form.date) {
      setForm((prev) => ({ ...prev, err: 'Please select a booking date.' }));
      return;
    }
    if (!form.address.trim()) {
      setForm((prev) => ({ ...prev, err: 'Please enter service address.' }));
      return;
    }

    const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const code = 'ELD-' + String(Date.now()).slice(-5);
    const now = Date.now();
    const sObj = form.service ? svc(form.service) : { name: 'Service' };

    const newBookingData = {
      code,
      city: form.city.trim().toLowerCase(),
      area: form.area.trim(),
      serviceName: sObj.name,
      service: form.service,
      serviceId: form.service,
      clientName: form.clientName.trim(),
      clientPhone: p,
      patientName: form.patientName.trim(),
      patientAge: form.patientAge.trim(),
      relation: form.relation.trim() || 'Other',
      plan: form.plan.trim() || 'Single visit',
      date: form.date,
      time: form.time.trim() || '9:00 AM',
      address: form.address.trim(),
      notes: form.notes.trim(),
      source: form.source.trim() || 'Call',
      status: 'requested',
      staffId: '',
      confirmedBy: '',
      confirmedAt: null,
      history: [
        { status: 'requested', at: now, by: 'admin', note: 'Booking request created by care desk' }
      ],
      createdAt: now
    };

    put('bookings', id, newBookingData);

    // Call backend API POST /api/v1/admin/booking/create and enforce status 'requested'
    try {
      const res = await bookingAPI.createBooking(newBookingData);
      const created = res?.data?.booking || res?.booking || res?.data || res;
      const bid = created?.id || created?.code;
      if (bid) {
        try {
          await bookingAPI.updateBookingStatus(bid, {
            status: 'requested',
            note: 'Booking request created by care desk',
          });
        } catch (statusErr) {
          console.warn('Backend update status to requested notice:', statusErr);
        }
      }
      await createBooking?.({
        ...newBookingData,
        ...(created && typeof created === 'object' ? created : {}),
        id: created?.id || id,
        code: created?.code || code,
        status: 'requested',
      });
    } catch (e) {
      console.warn('Backend create booking notice:', e);
      try {
        await createBooking?.(newBookingData);
      } catch (storeErr) {
        console.warn('Store create booking fallback notice:', storeErr);
      }
    }

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
            'New visit request ' + code,
            `${sObj.name} for ${form.patientName.trim()} · ${fmtDate(form.date)}, ${
              form.time
            } · request received`,
            id
          )
        );
    }

    notify(
      'client:' + p,
      'Booking request received',
      `Your ${sObj.name} booking request ${code} for ${form.patientName.trim()} has been received for ${fmtDate(form.date)}, ${form.time}.`,
      id
    );

    onBookingCreated(id, code);
  };

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] focus:border-[#0E2F5A] shadow-2xs transition h-[40px]';
  const labelCls =
    'block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5 h-5 leading-5 truncate';

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
        {/* Form Fields: 5-column responsive grid with expanded Service field */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
          {/* 1. Client Name */}
          <div>
            <label className={labelCls}>Client name</label>
            <input
              type="text"
              required
              placeholder="Client full name"
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
              placeholder="9876543210"
              value={form.clientPhone}
              onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
              className={`${inputCls} font-mono`}
            />
          </div>

          {/* 3. Request came via */}
          <div>
            <label className={labelCls}>Request came via</label>
            {customSource ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type source (e.g. Referral)"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className={`${inputCls} pr-8`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomSource(false);
                    setForm({ ...form, source: '' });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1"
                  title="Choose from list"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={form.source}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setCustomSource(true);
                    setForm({ ...form, source: '' });
                  } else {
                    setForm({ ...form, source: e.target.value });
                  }
                }}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Select source…</option>
                <option value="__custom__">+ Type custom source…</option>
                {['Call', 'WhatsApp', 'App', 'Walk-in'].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4. City */}
          <div>
            <label className={labelCls}>City</label>
            <FormCityDropdown
              value={form.city}
              onChange={(city) => setForm({ ...form, city })}
              placeholder="Select city..."
            />
          </div>

          {/* 5. Area / Locality */}
          <div>
            <label className={labelCls}>Area / Locality</label>
            <input
              type="text"
              placeholder="e.g. Andheri West, Bandra"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 6. Patient Name */}
          <div>
            <label className={labelCls}>Patient name</label>
            <input
              type="text"
              required
              placeholder="Patient full name"
              value={form.patientName}
              onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 7. Patient Age */}
          <div>
            <label className={labelCls}>Patient age</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              placeholder="e.g. 65"
              value={form.patientAge}
              onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 8. Relation to client */}
          <div>
            <label className={labelCls}>Relation to client</label>
            {customRelation ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type relation (e.g. Uncle)"
                  value={form.relation}
                  onChange={(e) => setForm({ ...form, relation: e.target.value })}
                  className={`${inputCls} pr-8`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomRelation(false);
                    setForm({ ...form, relation: '' });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1"
                  title="Choose from list"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={form.relation}
                onChange={(e) => {
                  if (e.target.value === '__custom__' || e.target.value === 'Other') {
                    setCustomRelation(true);
                    setForm({ ...form, relation: '' });
                  } else {
                    setForm({ ...form, relation: e.target.value });
                  }
                }}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Select relation…</option>
                <option value="__custom__">+ Type custom relation…</option>
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 9. Date */}
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

          {/* 10. Time */}
          <div>
            <label className={labelCls}>Time</label>
            {customTime ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 10:30 AM or 4:00 PM"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={`${inputCls} pr-8`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomTime(false);
                    setForm({ ...form, time: '' });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1"
                  title="Choose from slots"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={form.time}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setCustomTime(true);
                    setForm({ ...form, time: '' });
                  } else {
                    setForm({ ...form, time: e.target.value });
                  }
                }}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Select time slot…</option>
                <option value="__custom__">+ Custom time…</option>
                {SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 11. Service (Wider input spanning 3 columns so full name displays) */}
          <div className="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-3">
            <label className={labelCls}>
              Service <span className="text-rose-500 font-bold">*</span>
            </label>
            <select
              value={form.service}
              required
              onChange={(e) => handleServiceChange(e.target.value)}
              className={`${inputCls} cursor-pointer font-medium text-slate-800`}
            >
              <option value="">Select a service…</option>
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
            {selectedServiceObj && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                {priceLabel(selectedServiceObj)}
              </span>
            )}
          </div>

          {/* 12. Plan / Option (Spanning 2 columns) */}
          <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
            <label className={labelCls}>Plan / option</label>
            {customPlan ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 8-hr shift, Monthly"
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  className={`${inputCls} pr-8`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomPlan(false);
                    setForm({ ...form, plan: '' });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1"
                  title="Choose from plan options"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={form.plan}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setCustomPlan(true);
                    setForm({ ...form, plan: '' });
                  } else {
                    setForm({ ...form, plan: e.target.value });
                  }
                }}
                className={`${inputCls} cursor-pointer`}
                disabled={!form.service}
              >
                {!form.service ? (
                  <option value="">Select service first…</option>
                ) : (
                  <>
                    <option value="">Select plan…</option>
                    <option value="__custom__">+ Custom plan…</option>
                    {(selectedServiceObj?.options || ['Single visit']).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
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
            Create booking request
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
