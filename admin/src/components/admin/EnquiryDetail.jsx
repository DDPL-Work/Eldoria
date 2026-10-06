import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { useFiles } from '../../context/FileContext';
import { fmtTs, telHref, waHref, ENQ_ST } from '../../constants/data';

export function EnquiryDetail({
  enquiryId,
  onBack,
  onOpenBooking,
  onConvertBooking,
  onPreviewFile,
  onShowToast
}) {
  const { data, patch, notify, cityName, catsAll, svcInCat } = useStore();
  const { fileGet } = useFiles();

  const e = data.enquiries[enquiryId];

  const [note, setNote] = useState(e?.adminNote || '');
  const [rec, setRec] = useState(e?.recommended || '');

  if (!e) {
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
          Help request not found
        </div>
      </div>
    );
  }

  const msg = `Hello ${e.clientName}, this is the Eldoria Care at Home clinical team regarding your request ${e.code}.`;

  const handleSaveRecommendation = () => {
    const trimmed = note.trim();
    patch('enquiries', e.id, {
      adminNote: trimmed,
      recommended: rec,
      status: e.status === 'new' ? 'contacted' : e.status,
      history: (e.history || []).concat([
        {
          status: e.status === 'new' ? 'contacted' : e.status,
          at: Date.now(),
          by: 'admin',
          note: trimmed || 'Recommendation updated'
        }
      ])
    });

    const recommendedSvc = rec && data.services[rec] ? `Recommended: ${data.services[rec].name}. ` : '';
    notify(
      'client:' + e.clientPhone,
      'Our care team replied',
      recommendedSvc + (trimmed || 'Open your help request in the app to view our recommendation.'),
      '',
      { enqId: e.id }
    );

    onShowToast?.('Saved & shared recommendation with family');
  };

  const handleStatusToggle = (newStatus) => {
    patch('enquiries', e.id, {
      status: newStatus,
      history: (e.history || []).concat([
        { status: newStatus, at: Date.now(), by: 'admin' }
      ])
    });
    onShowToast?.(newStatus === 'closed' ? 'Request closed' : 'Request reopened');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {e.code}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {e.clientName}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Care consultation · {cityName(e.city)}
            </p>
          </div>
        </div>

        <StatusBadge status={e.status} type="enquiry" />
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Need description, attached files, timeline */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                What the Customer Described
              </h2>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {e.description}
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
              <div>
                <dt className="text-slate-400 font-semibold">Client Mobile</dt>
                <dd className="font-bold text-slate-800 font-mono">
                  <a href={telHref(e.clientPhone)} className="text-teal-700 hover:underline">
                    +91 {e.clientPhone}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold">Patient Category</dt>
                <dd className="font-bold text-slate-800">{e.patientType || 'General care'}</dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold">Patient Age</dt>
                <dd className="font-bold text-slate-800">{e.patientAge ? `${e.patientAge} years` : '—'}</dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold">Care Duration</dt>
                <dd className="font-bold text-slate-800">{e.duration || '—'}</dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold">Daily Timing</dt>
                <dd className="font-bold text-slate-800">{e.timing || '—'}</dd>
              </div>

              <div>
                <dt className="text-slate-400 font-semibold">Received On</dt>
                <dd className="font-bold text-slate-800 font-mono">{fmtTs(e.createdAt)}</dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-slate-400 font-semibold">Location</dt>
                <dd className="font-bold text-slate-800">
                  {e.address ? `${e.address}, ` : ''}
                  {cityName(e.city)}
                </dd>
              </div>
            </dl>

            {/* Attached Documents or Photos */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Attached Documents &amp; Prescriptions
              </h3>

              {(e.files || []).length === 0 ? (
                <div className="text-xs text-slate-400">No medical files or photos attached.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {e.files.map((fileMeta) => {
                    const cached = fileGet(fileMeta.id);

                    return (
                      <div
                        key={fileMeta.id}
                        className="p-2 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => onPreviewFile(fileMeta.id)}
                          className="w-full h-24 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90"
                        >
                          {cached?.data ? (
                            cached.type?.startsWith('image/') ? (
                              <img
                                src={cached.data}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-slate-700">📄 PDF</span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">View file</span>
                          )}
                        </button>
                        <p className="text-[11px] text-slate-600 font-medium truncate">
                          {fileMeta.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History Timeline */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Consultation History
              </h3>
              <div className="space-y-2.5">
                {(e.history || []).slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                    <div>
                      <span className="font-bold text-slate-800">
                        {(ENQ_ST[h.status] || [h.status])[0]}
                      </span>{' '}
                      <span className="text-slate-400">· {h.by === 'admin' ? 'Care desk' : 'Family'}</span>
                      {h.note && (
                        <p className="text-slate-700 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
                          {h.note}
                        </p>
                      )}
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {fmtTs(h.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right (1 Col): Contact, Recommendation & Conversion */}
        <div className="space-y-6">
          {/* Quick Contact Card */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Contact Family
            </h2>
            <div className="flex gap-2">
              <a
                href={telHref(e.clientPhone)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
              >
                <Icon name="phone" size={15} />
                <span>Call phone</span>
              </a>
              <a
                href={waHref(e.clientPhone, msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
              >
                <Icon name="wa" size={15} />
                <span>WhatsApp</span>
              </a>
            </div>
          </section>

          {/* Clinical Recommendation Card */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Recommend a Service
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recommended catalog service
              </label>
              <select
                value={rec}
                onChange={(e) => setRec(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 cursor-pointer"
              >
                <option value="">Select recommended service…</option>
                {catsAll().map((c) => {
                  const svcs = svcInCat(c.id, false);
                  if (svcs.length === 0) return null;
                  return (
                    <optgroup key={c.id} label={c.name}>
                      {svcs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical note for the customer
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Based on the patient’s condition, we suggest 12-hr elder caregiver support combined with 3 physio sessions per week."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The family sees this note and a direct "Book now" button in their mobile app.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveRecommendation}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
              >
                Save &amp; mark contacted
              </button>

              <button
                type="button"
                onClick={() => onConvertBooking(e.id)}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Icon name="cal" size={16} />
                <span>Create confirmed booking</span>
              </button>
            </div>
          </section>

          {/* Linked Booking Link (if converted) */}
          {e.bookingId && data.bookings[e.bookingId] && (
            <button
              type="button"
              onClick={() => onOpenBooking(e.bookingId)}
              className="w-full p-4 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-bold flex items-center justify-between transition cursor-pointer"
            >
              <span>Linked Booking: {data.bookings[e.bookingId].code}</span>
              <span>Open booking →</span>
            </button>
          )}

          {/* Close or Reopen */}
          <div className="pt-2">
            {e.status === 'closed' ? (
              <button
                type="button"
                onClick={() => handleStatusToggle('new')}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Reopen inquiry
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStatusToggle('closed')}
                className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs cursor-pointer"
              >
                Close inquiry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
