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
      <div className="p-4 sm:p-6 w-full space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <Icon name="back" size={16} />
          <span>Back</span>
        </button>
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500 font-bold">
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

    const recommendedSvc =
      rec && data.services[rec] ? `Recommended: ${data.services[rec].name}. ` : '';
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
    <div className="p-4 sm:p-4 w-full space-y-4">
      {/* Header: Back button + Title + Status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
            aria-label="Back"
          >
            <Icon name="back" size={18} />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {e.code} · {e.clientName}
          </h1>
        </div>

        <StatusBadge status={e.status} type="enquiry" />
      </div>

      {/* Grid: 2 Columns with reduced gap and balanced column width */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Left Column: Need description, metadata, files, timeline */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-3.5">
          <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              What the customer needs
            </h2>
            <div className="text-xs sm:text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
              {e.description}
            </div>

            <dl className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-xs pt-3 border-t border-slate-100">
              <dt className="text-slate-500 font-medium">Client</dt>
              <dd className="font-semibold text-slate-800">
                {e.clientName} ·{' '}
                <a
                  href={telHref(e.clientPhone)}
                  className="text-[#0E2F5A] underline font-mono"
                >
                  +91 {e.clientPhone}
                </a>
              </dd>

              <dt className="text-slate-500 font-medium">Patient type</dt>
              <dd className="font-semibold text-slate-800">{e.patientType || '—'}</dd>

              <dt className="text-slate-500 font-medium">Patient age</dt>
              <dd className="font-semibold text-slate-800">
                {e.patientAge ? `${e.patientAge}` : '—'}
              </dd>

              <dt className="text-slate-500 font-medium">Location</dt>
              <dd className="font-semibold text-slate-800">
                {e.address ? `${e.address}, ` : ''}
                {cityName(e.city)}
              </dd>

              <dt className="text-slate-500 font-medium">Duration</dt>
              <dd className="font-semibold text-slate-800">{e.duration || '—'}</dd>

              <dt className="text-slate-500 font-medium">Timing</dt>
              <dd className="font-semibold text-slate-800">{e.timing || '—'}</dd>

              <dt className="text-slate-500 font-medium">Received</dt>
              <dd className="font-semibold text-slate-800 font-mono">{fmtTs(e.createdAt)}</dd>
            </dl>

            {/* Attached Documents or Photos */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Documents &amp; photos
              </h3>

              {(e.files || []).length === 0 ? (
                <div className="text-xs text-slate-400">No files attached.</div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {e.files.map((fileMeta) => {
                    const cached = fileGet(fileMeta.id);

                    return (
                      <div key={fileMeta.id} className="w-28 space-y-1">
                        <button
                          type="button"
                          onClick={() => onPreviewFile(fileMeta.id)}
                          className="w-28 h-28 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center p-2 cursor-pointer hover:border-slate-300 transition overflow-hidden shadow-2xs group"
                        >
                          {cached?.data && cached.type?.startsWith('image/') ? (
                            <img
                              src={cached.data}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-lg border border-slate-100 p-2 text-slate-400">
                              <div className="w-full space-y-1.5 opacity-60">
                                <div className="h-1 bg-slate-300 rounded-full w-3/4"></div>
                                <div className="h-1 bg-slate-200 rounded-full w-full"></div>
                                <div className="h-1 bg-slate-200 rounded-full w-5/6"></div>
                                <div className="h-1 bg-slate-200 rounded-full w-2/3"></div>
                              </div>
                            </div>
                          )}
                        </button>
                        <p className="text-[11px] text-slate-500 truncate text-center font-mono">
                          {fileMeta.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History Timeline */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                History
              </h3>
              <div className="space-y-2">
                {(e.history || []).slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#F2A01F] shrink-0 mt-1.5" />
                    <div>
                      <div className="font-bold text-slate-800">
                        {(ENQ_ST[h.status] || [h.status])[0]} · {h.by === 'admin' ? 'Care desk' : 'Client'}
                      </div>
                      {h.note && (
                        <p className="text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
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

        {/* Right Column: Contact the customer & Recommend a service */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-3.5">
          {/* Quick Contact Card matching Screenshot 2 */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Contact the customer
            </h2>
            <div className="flex gap-2.5">
              <a
                href={telHref(e.clientPhone)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#0E2F5A] hover:bg-[#163D70] text-white font-bold text-xs sm:text-sm whitespace-nowrap transition shadow-xs"
              >
                <Icon name="phone" size={16} />
                <span>Call customer</span>
              </a>
              <a
                href={waHref(e.clientPhone, msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#1E8E3E] hover:bg-[#167833] text-white font-bold text-xs sm:text-sm whitespace-nowrap transition shadow-xs"
              >
                <Icon name="wa" size={16} />
                <span>WhatsApp</span>
              </a>
            </div>
          </section>

          {/* Clinical Recommendation Card */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
            <h2 className="text-sm font-bold text-slate-900">
              Recommend a service
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recommended service
              </label>
              <select
                value={rec}
                onChange={(e) => setRec(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] cursor-pointer"
              >
                <option value="">Choose a service…</option>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Note to the customer
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. We recommend a 12-hour caregiver plus 5 physio sessions."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The customer sees this note and a “Book now” button in their app.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSaveRecommendation}
                className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition cursor-pointer shadow-2xs text-center"
              >
                Save &amp; mark contacted
              </button>

              <button
                type="button"
                onClick={() => onConvertBooking(e.id)}
                className="w-full py-2.5 px-4 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-extrabold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="cal" size={16} />
                <span>Create booking</span>
              </button>
            </div>

            {/* Linked Booking Link (if converted) */}
            {e.bookingId && data.bookings[e.bookingId] && (
              <button
                type="button"
                onClick={() => onOpenBooking(e.bookingId)}
                className="w-full p-3 rounded-xl bg-[#E4ECF7] hover:bg-[#d5e3f3] border border-[#c3d5eb] text-[#0E2F5A] text-xs font-bold flex items-center justify-between transition cursor-pointer"
              >
                <span>Linked Booking: {data.bookings[e.bookingId].code}</span>
                <span>Open booking →</span>
              </button>
            )}
          </section>

          {/* Close or Reopen Request Button below card matching Screenshot 2 */}
          <div>
            {e.status === 'closed' ? (
              <button
                type="button"
                onClick={() => handleStatusToggle('new')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-2xs text-center"
              >
                Reopen request
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStatusToggle('closed')}
                className="w-full py-2.5 px-4 rounded-lg border border-red-200/90 bg-white hover:bg-red-50 text-[#991B1B] font-bold text-xs sm:text-sm transition cursor-pointer shadow-2xs text-center"
              >
                Close request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
