import { useState, useRef } from 'react';
import { Icon } from '../../constants/icons';
import { FormCityDropdown } from '../common/FormCityDropdown';
import { useStore } from '../../context/StoreContext';
import { openDocument } from '../../services/documentViewer';
import { Lightbox } from '../common/Lightbox';
import {
  RELATIONS,
  SLOTS,
  priceLabel,
  todayISO,
  digits,
  fmtDate,
  DEFAULT_CITIES
} from '../../constants/data';

const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    r.readAsDataURL(file);
  });

const compressImageIfNeeded = async (file, maxDim = 1600, quality = 0.85) => {
  if (!file.type || !file.type.startsWith('image/')) {
    return readFileAsBase64(file);
  }
  if (file.size < 500 * 1024) {
    return readFileAsBase64(file);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL(file.type || 'image/jpeg', quality);
          resolve(dataUrl);
        } catch (_) {
          resolve(e.target.result);
        }
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export function NewBooking({ onBack, onBookingCreated, fromEnqId }) {
  const {
    selectedCity,
    // cities,
    // services,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patient Medical History Documents state (supports multiple files simultaneously)
  const [medicalFiles, setMedicalFiles] = useState(() =>
    Array.isArray(enq?.files) ? enq.files : []
  );
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [selectedPreview, setSelectedPreview] = useState(null);
  const fileInputRef = useRef(null);

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

  const handleFilesAdded = async (fileList) => {
    const rawFiles = Array.from(fileList || []);
    if (!rawFiles.length) return;

    setFileError('');
    setIsProcessingFiles(true);

    const maxFileSize = 10 * 1024 * 1024; // 10MB limit per file
    const processedFiles = [];
    const errors = [];

    for (const file of rawFiles) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isImg = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

      if (!isPdf && !isImg) {
        errors.push(`"${file.name}" is not supported. Please select PDF or image files.`);
        continue;
      }

      if (file.size > maxFileSize) {
        errors.push(`"${file.name}" exceeds the 10MB file limit.`);
        continue;
      }

      try {
        const dataUrl = await compressImageIfNeeded(file);
        if (!dataUrl) {
          errors.push(`Could not read "${file.name}".`);
          continue;
        }

        const id = 'med_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        // Create a blob URL for safe, immediate in-browser tab viewing (avoids Chromium data: URL navigation blocks)
        let blobUrl = '';
        try {
          blobUrl = URL.createObjectURL(file);
        } catch (_) {}

        processedFiles.push({
          id,
          name: file.name,
          type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          size: file.size,
          data: dataUrl,
          blobUrl: blobUrl || dataUrl,
          url: blobUrl || dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin',
        });
      } catch (err) {
        console.error('File read error:', err);
        errors.push(`Error reading "${file.name}".`);
      }
    }

    if (errors.length > 0) {
      setFileError(errors.join(' '));
    }

    if (processedFiles.length > 0) {
      setMedicalFiles((prev) => [...prev, ...processedFiles]);
    }

    setIsProcessingFiles(false);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setMedicalFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

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

    if (isProcessingFiles) {
      setForm((prev) => ({
        ...prev,
        err: 'Please wait until medical document files have finished loading.',
      }));
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setForm((prev) => ({ ...prev, err: '' }));

    const now = Date.now();
    const sObj = form.service ? svc(form.service) : { name: 'Service' };

    const bookingPayload = {
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
      files: medicalFiles,
    };

    try {
      // Single backend dispatch via createBooking (backed by Redux createBookingThunk)
      const resultAction = await createBooking(bookingPayload);

      if (resultAction?.error || resultAction?.type?.endsWith('rejected')) {
        throw new Error(
          resultAction?.payload || resultAction?.error?.message || 'Failed to create booking request.'
        );
      }

      const created =
        resultAction?.payload?.booking ||
        resultAction?.payload?.data ||
        resultAction?.payload ||
        resultAction;

      const finalId = created?.id || created?.code || ('b' + Date.now().toString(36));
      const finalCode = created?.code || ('ELD-' + String(Date.now()).slice(-5));

      // Put real created booking into local store cache
      put('bookings', String(finalId), {
        ...bookingPayload,
        ...(created && typeof created === 'object' ? created : {}),
        id: finalId,
        code: finalCode,
        status: 'requested',
        files: created?.files || medicalFiles,
        confirmedBy: null,
        confirmedAt: null,
        createdAt: now,
        history: [
          { status: 'requested', at: now, by: 'admin', note: 'Booking request created by care desk' }
        ],
      });

      if (fromEnqId && data.enquiries[fromEnqId]) {
        const eDoc = data.enquiries[fromEnqId];
        patch('enquiries', eDoc.id, {
          status: 'converted',
          bookingId: finalId,
          recommended: form.service,
          history: (eDoc.history || []).concat([
            { status: 'converted', at: now, by: 'admin', note: `Booking ${finalCode} created` }
          ])
        });
      }

      if (staffCanConfirm()) {
        staffList()
          .filter((st) => (st.city || DEFAULT_CITIES[0].id) === form.city)
          .forEach((st) =>
            notify(
              'staff:' + st.id,
              'New visit request ' + finalCode,
              `${sObj.name} for ${form.patientName.trim()} · ${fmtDate(form.date)}, ${
                form.time
              } · request received`,
              finalId
            )
          );
      }

      notify(
        'client:' + p,
        'Booking request received',
        `Your ${sObj.name} booking request ${finalCode} for ${form.patientName.trim()} has been received for ${fmtDate(form.date)}, ${form.time}.`,
        finalId
      );

      onBookingCreated(finalId, finalCode);
    } catch (err) {
      console.error('Create booking failed:', err);
      setForm((prev) => ({
        ...prev,
        err: err?.message || 'Failed to create booking request. Please try again.',
      }));
      setIsSubmitting(false);
    }
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

        {/* 14. Patient Medical History Documents (Multiple file upload) */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-[13px] font-semibold text-slate-800">
                Patient Medical History Documents
              </label>
              {medicalFiles.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0E2F5A]/10 text-[#0E2F5A]">
                  {medicalFiles.length}
                </span>
              )}
            </div>
            {medicalFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setMedicalFiles([])}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Upload patient reports and test documents (e.g. blood report, urine report, discharge summary, ECG, prescriptions). You can select and upload multiple files simultaneously.
          </p>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 select-none ${
              isDragging
                ? 'border-[#0E2F5A] bg-[#0E2F5A]/5 ring-2 ring-[#0E2F5A]/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-[#0E2F5A]">
              {isProcessingFiles ? (
                <span className="w-4 h-4 border-2 border-[#0E2F5A] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="upload" size={18} />
              )}
            </div>
            <div className="text-xs font-semibold text-slate-800">
              {isProcessingFiles
                ? 'Processing selected files...'
                : 'Click to upload or drag & drop medical reports here'}
            </div>
            <div className="text-[11px] text-slate-500">
              Multiple files supported · PDF, JPG, PNG, WEBP (up to 10MB per file)
            </div>
          </div>

          {fileError && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center justify-between">
              <span>{fileError}</span>
              <button
                type="button"
                onClick={() => setFileError('')}
                className="text-amber-700 hover:text-amber-900 ml-2 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Uploaded Documents List */}
          {medicalFiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {medicalFiles.map((f, idx) => {
                const isPdf = f.type?.includes('pdf') || f.name?.toLowerCase().endsWith('.pdf');
                return (
                  <div
                    key={f.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 shadow-2xs hover:bg-slate-100/70 transition"
                  >
                    <div
                      className="min-w-0 flex items-center gap-2.5 cursor-pointer flex-1"
                      onClick={() => setSelectedPreview(f)}
                      title="Click to preview inline"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <Icon name={isPdf ? 'fileText' : 'image'} size={15} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium text-slate-800 truncate max-w-[190px] sm:max-w-[230px]"
                          title={f.name}
                        >
                          {f.name || `Document ${idx + 1}`}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(f.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDocument(f);
                        }}
                        className="text-[11px] font-bold text-[#0E2F5A] hover:underline flex items-center gap-1 px-1.5 py-1 cursor-pointer"
                        title="Open in new browser tab"
                      >
                        <span>View</span>
                        <Icon name="external" size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                        title="Remove document"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {form.err && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            {form.err}
          </div>
        )}

        {/* 15. Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || isProcessingFiles}
            className="px-5 py-2.5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] disabled:opacity-60 disabled:cursor-not-allowed text-[#0A2342] font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin" />
                <span>Creating booking...</span>
              </>
            ) : isProcessingFiles ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin" />
                <span>Processing files...</span>
              </>
            ) : (
              'Create booking request'
            )}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="px-4.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Inline Document Preview Modal (Lightbox) */}
      {selectedPreview && (
        <Lightbox
          fileId={selectedPreview}
          onClose={() => setSelectedPreview(null)}
        />
      )}
    </div>
  );
}
