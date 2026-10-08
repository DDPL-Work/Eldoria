import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
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
      onShowToast?.('Write a note telling the applicant what to change');
      return;
    }
    appDecision('changes', note.trim());
  };

  const handleReject = () => {
    appDecision('rejected', note.trim());
  };

  const handleRevoke = () => {
    appDecision('pending', 'Moved back to review by the care desk');
  };

  const photoFile = files.photo ? fileGet(files.photo.id) : null;

  return (
    <div className="p-4 sm:p-5 lg:p-4 w-full max-w-[1400px] mx-auto space-y-5">
      {/* 1. Header with Back Button, Name & Status Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center transition shadow-2xs cursor-pointer"
            aria-label="Back to applications"
          >
            <Icon name="back" size={18} />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {a.name}
          </h1>
        </div>

        {/* Status Pill Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
            st === 'pending'
              ? 'bg-[#FEF3C7] text-[#92400E]'
              : st === 'approved'
              ? 'bg-[#DCFCE7] text-[#166534]'
              : st === 'changes'
              ? 'bg-[#E0F2FE] text-[#075985]'
              : 'bg-[#FEE2E2] text-[#991B1B]'
          }`}
        >
          {st === 'pending'
            ? 'Under review'
            : st === 'approved'
            ? 'Approved'
            : st === 'changes'
            ? 'Changes requested'
            : 'Not approved'}
        </span>
      </div>

      {/* 2. Main 2-Column Split Layout with Compact Gap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-3 items-start">
        {/* Left Column (2 Cols): Profile, Personal details, Work profile, Emergency & Documents */}
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-lg p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
            {/* Profile Header: Avatar + Name + Phone / WhatsApp Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 pb-5 border-b border-slate-100">
              <button
                type="button"
                onClick={() => files.photo && onPreviewFile(files.photo.id)}
                disabled={!files.photo}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#EBF2FA] border border-slate-100 flex items-center justify-center font-bold text-2xl text-[#0A2342] overflow-hidden shrink-0 ${
                  files.photo ? 'cursor-pointer hover:ring-2 hover:ring-[#0A2342]/20' : ''
                }`}
              >
                {photoFile?.data ? (
                  <img src={photoFile.data} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{a.name?.[0] || 'A'}</span>
                )}
              </button>

              <div className="grow space-y-1.5">
                <div className="font-extrabold text-slate-900 text-xl">{a.name}</div>
                <div className="text-xs text-slate-500 font-medium">
                  {a.role} · {a.experience} yrs experience
                </div>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <a
                    href={telHref(a.phone)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs whitespace-nowrap leading-none select-none"
                  >
                    <Icon name="phone" size={14} />
                    <span>+91 {a.phone}</span>
                  </a>
                  <a
                    href={waHref(
                      a.phone,
                      `Hello ${a.name}, this is the Eldoria Care at Home team about your staff application.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-[#128C4A] hover:bg-[#0e703b] text-white text-xs font-bold transition shadow-2xs whitespace-nowrap leading-none select-none"
                  >
                    <Icon name="wa" size={14} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Personal details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-xs">
                <div className="text-slate-400 font-medium">Mobile</div>
                <div className="font-bold text-slate-800 font-mono">+91 {a.phone}</div>

                <div className="text-slate-400 font-medium">Email</div>
                <div className="font-bold text-slate-800">{a.email || '—'}</div>

                <div className="text-slate-400 font-medium">Date of birth</div>
                <div className="font-bold text-slate-800">
                  {a.dob || '—'}{a.dob ? ` · ${ageOf(a.dob)} yrs` : ''}
                </div>

                <div className="text-slate-400 font-medium">Gender</div>
                <div className="font-bold text-slate-800">{a.gender || '—'}</div>

                <div className="text-slate-400 font-medium">City</div>
                <div className="font-bold text-slate-800">
                  {cityName(sCity(a))}{a.area ? ` · ${a.area}` : ''}
                </div>

                <div className="text-slate-400 font-medium">Address</div>
                <div className="font-bold text-slate-800 leading-relaxed">{a.address || '—'}</div>
              </div>
            </div>

            {/* Work Profile */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Work profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-xs">
                <div className="text-slate-400 font-medium">Role</div>
                <div className="font-bold text-slate-800">{a.role}</div>

                <div className="text-slate-400 font-medium">Qualification</div>
                <div className="font-bold text-slate-800">{a.qualification || '—'}</div>

                <div className="text-slate-400 font-medium">Reg. number</div>
                <div className="font-bold text-slate-800 font-mono">{a.regNo || '—'}</div>

                <div className="text-slate-400 font-medium">Experience</div>
                <div className="font-bold text-slate-800">{a.experience} years</div>

                <div className="text-slate-400 font-medium self-center">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {(a.skillList || []).map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-md bg-[#EDF3FA] text-[#0A2342] font-semibold text-[11px]"
                    >
                      {sk}
                    </span>
                  ))}
                </div>

                <div className="text-slate-400 font-medium">Languages</div>
                <div className="font-bold text-slate-800">{(a.languages || []).join(', ') || '—'}</div>

                <div className="text-slate-400 font-medium">Available for</div>
                <div className="font-bold text-slate-800">{(a.availability || []).join(', ') || '—'}</div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Emergency contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-xs">
                <div className="text-slate-400 font-medium">Name</div>
                <div className="font-bold text-slate-800">
                  {em.name || '—'}{em.relation ? ` (${em.relation})` : ''}
                </div>

                <div className="text-slate-400 font-medium">Mobile</div>
                <div className="font-bold text-slate-800 font-mono">
                  {em.phone ? `+91 ${em.phone}` : '—'}
                </div>
              </div>
            </div>

            {/* Documents Section Matching Reference Image 3 */}
            <div className="pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Documents</h3>
                <span className="text-xs text-slate-500 font-medium">
                  {okReq} of {req.length} required verified
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {OB_DOCS.map((docDef) => {
                  const meta = files[docDef.k];
                  const cached = meta && fileGet(meta.id);
                  const isVerified = !!chk[docDef.k];

                  return (
                    <div
                      key={docDef.k}
                      className={`p-3 rounded-2xl border transition flex flex-col justify-between space-y-2.5 ${
                        isVerified
                          ? 'border-emerald-400 bg-emerald-50/20'
                          : meta
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-100 bg-slate-50/70'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        {/* Preview Box */}
                        <button
                          type="button"
                          disabled={!meta}
                          onClick={() => meta && onPreviewFile(meta.id)}
                          className={`w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center ${
                            meta ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                          }`}
                        >
                          {cached?.data || meta?.data ? (
                            (cached?.type || meta?.type)?.startsWith('image/') ? (
                              <img
                                src={cached?.data || meta?.data}
                                alt={docDef.label}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-slate-600">PDF</span>
                            )
                          ) : (
                            <span className="text-xs font-bold text-slate-400">Not provided</span>
                          )}
                        </button>

                        {/* Document title - single line, never break */}
                        <div
                          className="font-bold text-slate-900 text-xs whitespace-nowrap truncate min-w-0"
                          title={docDef.label}
                        >
                          {docDef.label}
                        </div>

                        {/* Required Badge - Fixed height row for perfect alignment */}
                        <div className="h-4 flex items-center">
                          {docDef.req ? (
                            <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-extrabold px-1.5 py-0.5 rounded leading-none shrink-0">
                              REQUIRED
                            </span>
                          ) : (
                            <span className="invisible text-[10px] py-0.5 leading-none select-none">
                              OPTIONAL
                            </span>
                          )}
                        </div>

                        {/* Filename & size */}
                        <div className="text-[11px] text-slate-400 truncate">
                          {meta ? `${meta.name} · ${Math.round(meta.size / 1024)} KB` : 'Not uploaded'}
                        </div>
                      </div>

                      {/* Verified Checkbox / Placeholder */}
                      <div className="pt-2 border-t border-slate-100">
                        {meta ? (
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isVerified}
                              onChange={(e) => handleDocCheck(docDef.k, e.target.checked)}
                              className="rounded border-slate-300 text-[#0A2342] focus:ring-[#0A2342] w-4 h-4 cursor-pointer shrink-0"
                            />
                            <span className="leading-none">Verified</span>
                          </label>
                        ) : (
                          <div className="h-4 text-[11px] text-slate-400 italic select-none">
                            Not uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (1 Col): Decision Card & History Card Matching Reference Image 4 */}
        <div className="space-y-6">
          {/* Decision Card */}
          <section className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
            <h2 className="text-base font-extrabold text-[#0A2342]">Decision</h2>

            {st === 'approved' && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
                Approved {fmtTs(a.approvedAt)}. {a.name.split(' ')[0]} can sign in and receive visits.
              </div>
            )}

            {st === 'rejected' && (
              <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
                Not approved. {a.reviewNote || 'Application rejected by care desk.'}
              </div>
            )}

            {st === 'changes' && (
              <div className="p-3 rounded-xl bg-sky-50 text-sky-800 text-xs font-medium border border-sky-200">
                Waiting for applicant to update: {a.reviewNote}
              </div>
            )}

            {st !== 'approved' ? (
              <div className="space-y-3.5">
                <p className={`text-xs ${allOk ? 'text-emerald-700 font-bold' : 'text-slate-600 font-medium'}`}>
                  {allOk
                    ? 'All required documents are verified.'
                    : 'Tick "Verified" on each required document to enable approval.'}
                </p>

                <div className="space-y-1">
                  <label htmlFor="apNote" className="block text-xs font-bold text-slate-800">
                    Note to the applicant
                  </label>
                  <textarea
                    id="apNote"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Required for changes or rejection, e.g. ID photo is blurry, please upload again."
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2342] resize-none"
                  />
                </div>

                {/* Approve & activate Button */}
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!allOk}
                  className={`w-full h-11 px-4 rounded-xl font-extrabold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 select-none whitespace-nowrap leading-none ${
                    allOk
                      ? 'bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] cursor-pointer'
                      : 'bg-[#F6C580] text-[#A67B40] cursor-not-allowed opacity-90'
                  }`}
                >
                  <Icon name="check" size={17} strokeWidth={2.8} />
                  <span>Approve &amp; activate</span>
                </button>

                {/* Bottom Action Buttons: Request changes & Reject */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleRequestChanges}
                    className="h-10 px-2 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0A2342] font-extrabold text-xs transition cursor-pointer shadow-2xs flex items-center justify-center text-center whitespace-nowrap leading-none select-none"
                  >
                    Request changes
                  </button>

                  {confirmReject ? (
                    <button
                      type="button"
                      onClick={handleReject}
                      className="h-10 px-2 sm:px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition cursor-pointer shadow-2xs flex items-center justify-center text-center whitespace-nowrap leading-none select-none"
                    >
                      Confirm reject
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReject(true)}
                      className="h-10 px-2 sm:px-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-[#991B1B] font-extrabold text-xs transition cursor-pointer shadow-2xs flex items-center justify-center text-center whitespace-nowrap leading-none select-none"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onBack}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center justify-center text-center whitespace-nowrap leading-none select-none"
                >
                  Open Staff list
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="h-10 px-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 font-bold text-xs transition cursor-pointer flex items-center justify-center text-center whitespace-nowrap leading-none select-none"
                >
                  Move back to review
                </button>
              </div>
            )}
          </section>

          {/* History Card */}
          <section className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
            <h2 className="text-base font-extrabold text-[#0A2342]">History</h2>

            <div className="space-y-3">
              {hist.map((h, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${
                      h.status === 'approved'
                        ? 'bg-emerald-600'
                        : h.status === 'rejected'
                        ? 'bg-red-600'
                        : h.status === 'changes'
                        ? 'bg-sky-600'
                        : 'bg-[#F59E0B]'
                    }`}
                  />
                  <div className="space-y-0.5 grow">
                    <div className="font-extrabold text-[#0A2342] text-xs">
                      {(APPR[h.status] || [h.status])[0]} · {h.by === 'admin' ? 'Care desk' : 'Applicant'}
                    </div>
                    {h.note && (
                      <div className="text-slate-600 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {h.note}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 font-medium">
                      {fmtTs(h.at)}
                    </div>
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
