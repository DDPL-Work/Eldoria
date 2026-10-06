import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { StatusBadge } from '../common/StatusBadge';
import { useStore } from '../../context/StoreContext';
import { useFiles } from '../../context/FileContext';
import {
  OB_DOCS,
  APPR,
  fmtTs,
  telHref,
  waHref,
  ageOf
} from '../../constants/data';

export function ApplicationDetail({ appId, onBack, onPreviewFile, onShowToast }) {
  const { data, patch, notify, apprOf, sCity, cityName } = useStore();
  const { fileGet } = useFiles();

  const [note, setNote] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);

  const a = data.staff[appId];

  if (!a || !a.applied) {
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
          Application not found
        </div>
      </div>
    );
  }

  const st = apprOf(a);
  const chk = a.docChecks || {};
  const files = a.files || {};
  const em = a.emergency || {};
  const req = OB_DOCS.filter((x) => x.req);
  const okReq = req.filter((x) => chk[x.k]).length;
  const allOk = okReq === req.length;
  const hist = (a.appHistory || []).slice().reverse();

  const handleDocCheck = (docKey, isChecked) => {
    patch('staff', a.id, {
      docChecks: {
        ...chk,
        [docKey]: isChecked
      }
    });
  };

  const appDecision = (status, reviewNote) => {
    const now = Date.now();
    const extra = status === 'approved' ? { approvedAt: now, docs: 'verified' } : {};

    patch('staff', a.id, {
      approval: status,
      reviewNote: reviewNote || '',
      reviewedAt: now,
      ...extra,
      appHistory: (a.appHistory || []).concat([
        { at: now, status, by: 'admin', note: reviewNote || '' }
      ])
    });

    const city = cityName(sCity(a));
    const msg = {
      approved: [
        'Welcome to Eldoria!',
        `Your application is approved. Sign in to the Staff app to start receiving visits in ${city}.`
      ],
      changes: ['Please update your application', reviewNote],
      rejected: ['Application not approved', reviewNote || 'Your application was not approved.'],
      pending: [
        'Application back under review',
        'The care desk is reviewing your application again.'
      ]
    }[status] || ['Application update', reviewNote];

    notify('staff:' + a.id, msg[0], msg[1], '', { appId: a.id });
    setNote('');
    setConfirmReject(false);
    onShowToast?.(`Application ${status}`);
  };

  const handleApprove = () => {
    if (!allOk) {
      onShowToast?.('Please verify all required documents first');
      return;
    }
    appDecision('approved', note.trim());
  };

  const handleRequestChanges = () => {
    if (!note.trim()) {
      onShowToast?.('Please write a note explaining what documents or details to update');
      return;
    }
    appDecision('changes', note.trim());
  };

  const handleReject = () => {
    if (!note.trim()) {
      onShowToast?.('Please write a reason before rejecting the application');
      return;
    }
    appDecision('rejected', note.trim());
  };

  const handleRevoke = () => {
    appDecision('pending', 'Moved back to review by the care desk');
  };

  const photoFile = files.photo ? fileGet(files.photo.id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
            aria-label="Back to onboarding"
          >
            <Icon name="back" size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {a.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Applied for: {a.role} · {a.experience} years experience
            </p>
          </div>
        </div>

        <StatusBadge status={st} type="onboarding" />
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Personal, Profile, Emergency & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <button
                type="button"
                onClick={() => files.photo && onPreviewFile(files.photo.id)}
                disabled={!files.photo}
                className={`w-20 h-20 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-xl text-teal-800 overflow-hidden shrink-0 ${
                  files.photo ? 'cursor-pointer hover:ring-2 hover:ring-teal-500/40' : ''
                }`}
              >
                {photoFile?.data ? (
                  <img src={photoFile.data} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{a.name?.[0] || 'A'}</span>
                )}
              </button>

              <div className="grow space-y-1">
                <div className="font-black text-slate-900 text-lg">{a.name}</div>
                <div className="text-xs text-slate-500 font-medium">
                  {a.role} · {a.experience} yrs experience · {cityName(sCity(a))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={telHref(a.phone)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                  >
                    <Icon name="phone" size={14} />
                    <span>+91 {a.phone}</span>
                  </a>
                  <a
                    href={waHref(
                      a.phone,
                      `Hello ${a.name}, this is the Eldoria Care at Home desk regarding your caregiver application.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
                  >
                    <Icon name="wa" size={14} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Details KV */}
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-wider mb-2">
                  Personal Details
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-slate-400 font-semibold">Mobile</dt>
                    <dd className="font-bold text-slate-800 font-mono">+91 {a.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold">Email</dt>
                    <dd className="font-bold text-slate-800">{a.email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold">Date of birth &amp; Age</dt>
                    <dd className="font-bold text-slate-800">
                      {a.dob || '—'} {a.dob ? `· ${ageOf(a.dob)} yrs` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold">Gender</dt>
                    <dd className="font-bold text-slate-800">{a.gender || '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-400 font-semibold">City &amp; Residential Address</dt>
                    <dd className="font-bold text-slate-800">
                      {a.address || '—'} ({cityName(sCity(a))})
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-wider mb-2 pt-3 border-t border-slate-100">
                  Professional Qualification
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-slate-400 font-semibold">Role</dt>
                    <dd className="font-bold text-slate-800">{a.role}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold">Qualification &amp; Council Reg</dt>
                    <dd className="font-bold text-slate-800">
                      {a.qualification || '—'} {a.regNo ? `· Reg: ${a.regNo}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold">Languages</dt>
                    <dd className="font-bold text-slate-800">
                      {(a.languages || []).join(', ') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold">Availability</dt>
                    <dd className="font-bold text-slate-800">
                      {(a.availability || []).join(', ') || '—'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-400 font-semibold mb-1">Key skills</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {(a.skillList || []).map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]"
                        >
                          {sk}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>

              {em.name && (
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-wider mb-2 pt-3 border-t border-slate-100">
                    Emergency Contact
                  </h3>
                  <div className="font-bold text-slate-800">
                    {em.name} {em.relation ? `(${em.relation})` : ''} ·{' '}
                    <span className="font-mono">+91 {em.phone}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Verification Documents Checklist */}
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Verification Documents
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {okReq} of {req.length} required verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {OB_DOCS.map((docDef) => {
                const meta = files[docDef.k];
                const cached = meta && fileGet(meta.id);
                const isVerified = !!chk[docDef.k];

                return (
                  <div
                    key={docDef.k}
                    className={`p-3 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                      isVerified
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : meta
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-100 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div>
                      {/* Document Preview Thumbnail Box */}
                      <button
                        type="button"
                        disabled={!meta}
                        onClick={() => meta && onPreviewFile(meta.id)}
                        className={`w-full h-28 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden mb-2 ${
                          meta ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'
                        }`}
                      >
                        {cached?.data ? (
                          cached.type?.startsWith('image/') ? (
                            <img
                              src={cached.data}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2 text-xs text-slate-600 font-bold">
                              📄 PDF Document
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Not uploaded</span>
                        )}
                      </button>

                      <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                        <span>{docDef.label}</span>
                        {docDef.req && (
                          <span className="text-[10px] font-bold text-red-600 uppercase">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {meta ? `${Math.round(meta.size / 1024)} KB` : 'Missing file'}
                      </div>
                    </div>

                    {meta && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isVerified}
                            onChange={(e) => handleDocCheck(docDef.k, e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Verified</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column (1 Col): Decision Card & Review History */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Desk Decision
            </h2>

            {st === 'approved' && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 text-xs border border-emerald-200">
                <b>Approved:</b> {a.name} is activated and can accept visits in {cityName(sCity(a))}.
              </div>
            )}

            {st === 'rejected' && (
              <div className="p-3 rounded-xl bg-red-50 text-red-900 text-xs border border-red-200">
                <b>Not approved:</b> {a.reviewNote || 'Application rejected by care desk.'}
              </div>
            )}

            {st === 'changes' && (
              <div className="p-3 rounded-xl bg-blue-50 text-blue-900 text-xs border border-blue-200">
                <b>Awaiting changes:</b> {a.reviewNote}
              </div>
            )}

            {st !== 'approved' ? (
              <div className="space-y-4">
                <div
                  className={`text-xs font-bold ${
                    allOk ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {allOk
                    ? '✓ All required documents are verified and ready for approval.'
                    : '⚠ Please verify each required document before approving.'}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Note to applicant (visible in mobile app)
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Please re-upload a clearer photo of your Aadhaar card."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!allOk}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                    allOk
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Icon name="check" size={17} strokeWidth={2.5} />
                  <span>Approve &amp; activate staff</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRequestChanges}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                  >
                    Request changes
                  </button>

                  {confirmReject ? (
                    <button
                      type="button"
                      onClick={handleReject}
                      className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Confirm reject
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReject(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition cursor-pointer"
                >
                  Move back to under review
                </button>
              </div>
            )}
          </section>

          {/* History */}
          <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Audit History
            </h2>

            <div className="space-y-3">
              {hist.map((h, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                  <div>
                    <span className="font-bold text-slate-800">
                      {(APPR[h.status] || [h.status])[0]}
                    </span>{' '}
                    <span className="text-slate-400">· {h.by === 'admin' ? 'Care desk' : 'Applicant'}</span>
                    {h.note && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
                        {h.note}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{fmtTs(h.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
