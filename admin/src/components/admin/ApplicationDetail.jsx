import React, { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { useStore } from '../../context/StoreContext';
import { useFiles } from '../../context/FileContext';
import { getStaffDocumentViewUrl, staffConfirmAPI } from '../../services/api';
import { normalizeStaffRequest } from '../../store/hooks';
import {
  OB_DOCS,
  APPR,
  fmtTs,
  telHref,
  waHref,
  ageOf
} from '../../constants/data';

export function ApplicationDetail({ appId, onBack, onPreviewFile, onShowToast }) {
  const {
    data,
    patch,
    notify,
    apprOf,
    sCity,
    cityName,
    applications,
    currentStaffRequest,
    fetchStaffRequests,
    fetchStaffRequestById,
    verifyStaffDocument,
    approveStaff,
    requestStaffChanges,
    rejectStaff,
    revokeStaffDecision,
    dataLoading
  } = useStore();
  const { fileGet } = useFiles();

  const [note, setNote] = useState('');
  const [actionModal, setActionModal] = useState(null); // 'request_changes' | 'reject' | null
  const [modalReason, setModalReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docLoading, setDocLoading] = useState({});

  // Staff booking confirmation & transfer permissions
  const [canConfirm, setCanConfirm] = useState(false);
  const [canTransfer, setCanTransfer] = useState(false);
  const [permLoading, setPermLoading] = useState(false);

  // Fetch applicant details by id and load latest staff requests from backend
  useEffect(() => {
    if (appId) {
      fetchStaffRequestById?.(appId);
    }
    fetchStaffRequests?.({ approval: 'all', limit: 100 });
  }, [appId, fetchStaffRequestById, fetchStaffRequests]);

  const allApps = applications();
  const matchedFromList = allApps.find(
    (x) => String(x.id) === String(appId) || String(x.staffId) === String(appId)
  );
  const matchedFromCurrent =
    currentStaffRequest &&
    (String(currentStaffRequest.id) === String(appId) ||
      String(currentStaffRequest.staffId) === String(appId))
      ? normalizeStaffRequest(currentStaffRequest)
      : null;

  const aRaw = matchedFromCurrent || matchedFromList || data.staff?.[appId];
  const a = aRaw
    ? aRaw.applied
      ? aRaw
      : { ...aRaw, applied: true, approval: aRaw.approval || 'approved' }
    : null;

  // Sync permissions state from normalized staff data
  useEffect(() => {
    if (a) {
      if (a.canConfirmBooking !== undefined) {
        setCanConfirm(Boolean(a.canConfirmBooking));
      }
      if (a.canTransferBooking !== undefined) {
        setCanTransfer(Boolean(a.canTransferBooking));
      }
    }
  }, [a?.canConfirmBooking, a?.canTransferBooking]);

  // If approved, fetch live permissions from backend
  useEffect(() => {
    const targetStaffId = a?.staffId || a?.raw?.staffId || a?.id || a?.backendId || appId;
    const approvalState = a?.approval || currentStaffRequest?.approval;
    if (approvalState === 'approved' && targetStaffId) {
      staffConfirmAPI
        .getStaffPermissions(targetStaffId)
        .then((res) => {
          const d = res?.data || res;
          if (d) {
            if (d.canConfirmBooking !== undefined) {
              setCanConfirm(Boolean(d.canConfirmBooking));
            }
            if (d.canTransferBooking !== undefined) {
              setCanTransfer(Boolean(d.canTransferBooking));
            }
          }
        })
        .catch((err) => {
          console.warn('Could not load staff booking permissions:', err);
        });
    }
  }, [a?.approval, currentStaffRequest?.approval, a?.id, a?.staffId, a?.raw?.staffId, a?.backendId, appId]);

  const handleTogglePermission = async (field, value) => {
    const targetStaffId = a?.staffId || a?.raw?.staffId || a?.id || a?.backendId || appId;
    if (!targetStaffId) {
      onShowToast?.('Staff ID not found');
      return;
    }

    setPermLoading(true);
    if (field === 'canConfirmBooking') setCanConfirm(value);
    if (field === 'canTransferBooking') setCanTransfer(value);

    try {
      const payload = { [field]: value };
      const res = await staffConfirmAPI.toggleStaffCanConfirm(targetStaffId, payload);
      const resData = res?.data || res;
      if (resData) {
        if (resData.canConfirmBooking !== undefined) setCanConfirm(Boolean(resData.canConfirmBooking));
        if (resData.canTransferBooking !== undefined) setCanTransfer(Boolean(resData.canTransferBooking));
      }
      if (a?.id) {
        patch?.('staff', a.id, { [field]: value });
      }
      const label = field === 'canConfirmBooking' ? 'Staff can confirm booking' : 'Staff can re-assign booking';
      onShowToast?.(`${label}: ${value ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      console.error('Failed to update staff booking permission:', err);
      if (field === 'canConfirmBooking') setCanConfirm(!value);
      if (field === 'canTransferBooking') setCanTransfer(!value);
      onShowToast?.(`Update failed: ${err?.message || 'Server error'}`);
    } finally {
      setPermLoading(false);
    }
  };

  if (dataLoading && !a) {
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
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <DatabaseLoader
            title="Fetching Staff Details from Database..."
            subtitle="Connecting to Eldoria backend server"
          />
        </div>
      </div>
    );
  }

  if (!a) {
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
          Staff member details not found
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

  // 1. PATCH /api/v1/admin/staff-requests/:id/verify-document
  const handleDocCheck = async (docKey, isChecked) => {
    const targetId = a.backendId || a.raw?.id || a.id || a.staffId || appId;
    const aliasMap = {
      experience: ['experienceLetter', 'experience_letter', 'experienceletter'],
      police: ['policeVerification', 'police_verification', 'policeverification'],
      idProof: ['id_proof', 'idproof', 'photo_id', 'photoId', 'aadhar', 'aadharCard'],
      qualification: ['qualification_certificate', 'qualificationCertificate', 'qualificationcert'],
      photo: ['profile_photo', 'profilePhoto'],
    };
    const aliases = aliasMap[docKey] || [];
    const updatedChecks = {
      ...chk,
      [docKey]: isChecked
    };
    aliases.forEach((al) => {
      updatedChecks[al] = isChecked;
    });

    // Optimistically update local view
    patch('staff', a.id, {
      docChecks: updatedChecks
    });

    setDocLoading((prev) => ({ ...prev, [docKey]: true }));
    try {
      if (verifyStaffDocument) {
        await verifyStaffDocument(targetId, {
          docKey,
          verified: isChecked,
          docChecks: updatedChecks,
          status: isChecked ? 'verified' : 'pending'
        });
      }
      onShowToast?.(`${docKey} marked as ${isChecked ? 'verified' : 'pending'}`);
    } catch (err) {
      console.warn('verifyStaffDocument API error:', err);
      onShowToast?.(`Document update failed: ${err?.message || 'Server error'}`);
      // Revert on failure
      patch('staff', a.id, {
        docChecks: chk
      });
    } finally {
      setDocLoading((prev) => ({ ...prev, [docKey]: false }));
    }
  };

  // 2. PATCH /api/v1/admin/staff-requests/:id/approve
  const handleApprove = async () => {
    if (!allOk) {
      onShowToast?.('Please verify all required documents first');
      return;
    }
    const targetId = a.backendId || a.raw?.id || a.id || a.staffId || appId;
    const reviewNote = note.trim();
    setIsSubmitting(true);
    try {
      if (approveStaff) {
        await approveStaff(targetId, {
          notes: reviewNote || undefined,
          note: reviewNote || undefined,
          reviewNote: reviewNote || undefined,
          docChecks: chk,
          docsStatus: 'verified'
        });
      }

      const now = Date.now();
      patch('staff', a.id, {
        approval: 'approved',
        docs: 'verified',
        reviewNote: reviewNote || '',
        reviewedAt: now,
        approvedAt: now,
        appHistory: (a.appHistory || []).concat([
          { at: now, status: 'approved', by: 'admin', note: reviewNote || 'Application approved' }
        ])
      });

      const city = cityName(sCity(a));
      notify(
        'staff:' + a.id,
        'Welcome to Eldoria!',
        `Your application is approved. Sign in to the Staff app to start receiving visits in ${city}.`,
        '',
        { appId: a.id }
      );
      setNote('');
      onShowToast?.('Staff application approved & activated successfully!');
    } catch (err) {
      console.error('Approve staff API error:', err);
      onShowToast?.(`Approval failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. PATCH /api/v1/admin/staff-requests/:id/request-changes
  const executeRequestChanges = async (changeNoteText) => {
    const changeNote = (changeNoteText !== undefined ? changeNoteText : note).trim();
    if (!changeNote) {
      onShowToast?.('Reason is required. Please specify what changes the applicant must make.');
      return false;
    }
    const targetId = a.backendId || a.raw?.id || a.id || a.staffId || appId;
    setIsSubmitting(true);
    try {
      if (requestStaffChanges) {
        await requestStaffChanges(targetId, {
          note: changeNote,
          notes: changeNote,
          reviewNote: changeNote,
          reason: changeNote,
          docChecks: chk
        });
      }

      const now = Date.now();
      patch('staff', a.id, {
        approval: 'changes',
        docs: 'pending',
        reviewNote: changeNote,
        reviewedAt: now,
        appHistory: (a.appHistory || []).concat([
          { at: now, status: 'changes', by: 'admin', note: changeNote }
        ])
      });

      notify(
        'staff:' + a.id,
        'Please update your application',
        changeNote,
        '',
        { appId: a.id }
      );
      setNote('');
      setActionModal(null);
      setModalReason('');
      setModalError('');
      onShowToast?.('Changes requested from applicant');
      return true;
    } catch (err) {
      console.error('Request changes API error:', err);
      onShowToast?.(`Request changes failed: ${err?.message || 'Server error'}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. PATCH /api/v1/admin/staff-requests/:id/reject
  const executeReject = async (rejectReasonText) => {
    const rejectReason = (rejectReasonText !== undefined ? rejectReasonText : note).trim();
    if (!rejectReason) {
      onShowToast?.('Rejection reason is mandatory. Application cannot be rejected without a reason.');
      return false;
    }
    const targetId = a.backendId || a.raw?.id || a.id || a.staffId || appId;
    setIsSubmitting(true);
    try {
      if (rejectStaff) {
        await rejectStaff(targetId, {
          reason: rejectReason,
          notes: rejectReason,
          reviewNote: rejectReason
        });
      }

      const now = Date.now();
      patch('staff', a.id, {
        approval: 'rejected',
        docs: 'rejected',
        reviewNote: rejectReason,
        reviewedAt: now,
        rejectedAt: now,
        appHistory: (a.appHistory || []).concat([
          { at: now, status: 'rejected', by: 'admin', note: rejectReason }
        ])
      });

      notify(
        'staff:' + a.id,
        'Application not approved',
        rejectReason,
        '',
        { appId: a.id }
      );
      setNote('');
      setActionModal(null);
      setModalReason('');
      setModalError('');
      onShowToast?.('Application rejected');
      return true;
    } catch (err) {
      console.error('Reject staff API error:', err);
      onShowToast?.(`Reject failed: ${err?.message || 'Server error'}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. PATCH /api/v1/admin/staff-requests/:id/revoke (move back to review)
  const handleRevoke = async () => {
    const targetId = a.backendId || a.raw?.id || a.id || a.staffId || appId;
    const revokeNote = 'Moved back to review by the care desk';
    setIsSubmitting(true);
    try {
      if (revokeStaffDecision) {
        await revokeStaffDecision(targetId, {
          note: revokeNote,
          notes: revokeNote
        });
      }

      const now = Date.now();
      patch('staff', a.id, {
        approval: 'pending',
        docs: 'pending',
        reviewNote: revokeNote,
        reviewedAt: now,
        appHistory: (a.appHistory || []).concat([
          { at: now, status: 'pending', by: 'admin', note: revokeNote }
        ])
      });

      notify(
        'staff:' + a.id,
        'Application back under review',
        revokeNote,
        '',
        { appId: a.id }
      );
      await fetchStaffRequestById?.(targetId);
      fetchStaffRequests?.({ approval: 'all', limit: 100 });
      onShowToast?.('Application moved back under review');
    } catch (err) {
      console.error('Revoke decision API error:', err);
      onShowToast?.(`Revoke failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const photoData = files.photo;
  const photoUrl =
    photoData?.data ||
    photoData?.url ||
    (typeof photoData === 'string' ? photoData : null) ||
    (photoData?.id ? fileGet(photoData.id)?.data : null) ||
    null;

  const photoStreamUrl = photoUrl
    ? getStaffDocumentViewUrl({
        url: photoUrl.startsWith('http') ? photoUrl : undefined,
        staffId: a.staffId || a.id,
        fileKey: 'photo',
        filename: `${(a.name || 'Staff').replace(/\s+/g, '_')}_Photo.jpg`,
      })
    : '';

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
              {/* Applicant Initials / Photo Link */}
              {(() => {
                const applicantInitials = a.name
                  ? a.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'A';

                return photoUrl ? (
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#EBF2FA] border border-slate-200/80 flex items-center justify-center font-bold text-2xl text-[#0A2342] overflow-hidden shrink-0 relative select-none cursor-pointer hover:ring-2 hover:ring-[#0A2342]/20 transition"
                    title={`Open ${a.name}'s photo in new tab`}
                  >
                    <img
                      src={photoUrl}
                      alt={a.name}
                      className="w-full h-full object-cover absolute inset-0"
                      onLoad={(e) => {
                        if (e.currentTarget.naturalWidth <= 2 && e.currentTarget.naturalHeight <= 2) {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="font-extrabold text-[#0A2342] text-2xl tracking-tight">
                      {applicantInitials}
                    </span>
                  </a>
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#EBF2FA] border border-slate-200/80 flex items-center justify-center font-bold text-2xl text-[#0A2342] overflow-hidden shrink-0 relative select-none">
                    <span className="font-extrabold text-[#0A2342] text-2xl tracking-tight">
                      {applicantInitials}
                    </span>
                  </div>
                );
              })()}

              <div className="grow space-y-1.5">
                <div className="font-extrabold text-slate-900 text-xl">{a.name}</div>
                <div className="text-xs text-slate-500 font-medium">
                  {a.role} · {a.experience} yrs experience{a.area ? ` · ${a.area}` : ''}
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
                <div className="font-bold text-slate-800 capitalize">
                  {a.cityName || cityName(sCity(a)) || a.city || '—'}
                </div>

                <div className="text-slate-400 font-medium">Area</div>
                <div className="font-bold text-slate-800">
                  {a.area || '—'}
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
                  const meta =
                    files[docDef.k] ||
                    (docDef.k === 'experience'
                      ? files.experienceLetter || files.experience_letter || files.experienceletter
                      : docDef.k === 'police'
                      ? files.policeVerification || files.police_verification || files.policeverification
                      : docDef.k === 'idProof'
                      ? files.id_proof || files.idproof || files.photo_id || files.photoId || files.aadhar || files.aadharCard
                      : docDef.k === 'qualification'
                      ? files.qualification_certificate || files.qualificationCertificate || files.qualificationcert || files.certificate
                      : null);
                  const cached = meta && meta.id ? fileGet(meta.id) : null;
                  const isVerified = Boolean(
                    chk[docDef.k] ||
                    (docDef.k === 'experience' && (chk.experienceLetter || chk.experience_letter || chk.experienceletter)) ||
                    (docDef.k === 'police' && (chk.policeVerification || chk.police_verification || chk.policeverification)) ||
                    (docDef.k === 'idProof' && (chk.id_proof || chk.idproof || chk.photo_id)) ||
                    (docDef.k === 'qualification' && (chk.qualification_certificate || chk.qualificationCertificate))
                  );
                  const fileSrc = meta?.data || meta?.url || cached?.data || (typeof meta === 'string' ? meta : null);
                  const fileName = meta?.name || meta?.filename || '';

                  const isPdf = Boolean(
                    meta?.isPdf ||
                    meta?.type === 'application/pdf' ||
                    cached?.type === 'application/pdf' ||
                    /\.pdf($|\?|#)/i.test(fileSrc || '') ||
                    /\.pdf($|\?|#)/i.test(fileName)
                  );

                  const isImage =
                    !isPdf &&
                    Boolean(
                      meta?.isImage ||
                      (meta?.type || cached?.type)?.startsWith('image/') ||
                      /\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?|#)/i.test(fileSrc || '') ||
                      /\.(jpeg|jpg|gif|png|webp|avif|svg)($|\?|#)/i.test(fileName) ||
                      fileSrc?.startsWith('data:image/') ||
                      docDef.k === 'photo'
                    );

                  const effectiveFileName =
                    fileName || `${docDef.label}.${isPdf ? 'pdf' : 'jpg'}`;

                  const streamUrl = fileSrc
                    ? getStaffDocumentViewUrl({
                        url: fileSrc.startsWith('http') ? fileSrc : undefined,
                        staffId: a.staffId || a.id,
                        fileKey: docDef.k,
                        filename: effectiveFileName,
                        format: isPdf ? 'pdf' : undefined,
                      })
                    : '';

                  // For images, direct CDN URL (fileSrc) works without proxying.
                  // For PDFs, streamUrl is needed to bypass Cloudinary's 401 ACL on raw documents.
                  const targetUrl = isPdf ? (streamUrl || fileSrc) : fileSrc;

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
                        {/* Document Box - Opens directly in a new tab */}
                        {fileSrc && targetUrl ? (
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative cursor-pointer hover:opacity-95 hover:shadow-xs transition block select-none"
                            title={`Open ${docDef.label} in new tab`}
                          >
                            {isImage ? (
                              <div className="w-full h-full relative flex items-center justify-center bg-slate-50">
                                <img
                                  src={fileSrc}
                                  alt={docDef.label}
                                  className="w-full h-full object-cover"
                                  onLoad={(e) => {
                                    if (e.currentTarget.naturalWidth <= 2 && e.currentTarget.naturalHeight <= 2) {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                      }
                                    }
                                  }}
                                  onError={(e) => {
                                    if (streamUrl && e.currentTarget.src !== streamUrl) {
                                      e.currentTarget.src = streamUrl;
                                    } else {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                      }
                                    }
                                  }}
                                />
                                <div
                                  style={{ display: 'none' }}
                                  className="flex-col items-center justify-center text-center p-2 w-full h-full bg-[#F8FAFC]"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-[#EBF2FA] text-[#0A2342] flex items-center justify-center mb-1">
                                    <Icon name="user" size={16} />
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-700">1×1 Test Photo</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center p-2.5 w-full h-full bg-[#FAF5F5] hover:bg-[#F5EEEE] transition">
                                <span className="text-[11px] font-black tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                  <Icon name="fileText" size={12} />
                                  PDF
                                </span>
                                <span className="text-[10px] text-slate-700 font-semibold mt-1.5 truncate max-w-[120px]" title={effectiveFileName}>
                                  {effectiveFileName}
                                </span>
                              </div>
                            )}
                          </a>
                        ) : (
                          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center cursor-default select-none">
                            <span className="text-xs font-bold text-slate-400">Not provided</span>
                          </div>
                        )}

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
                          {meta
                            ? `${meta.name || meta.filename || 'Document'} · ${
                                meta.size ? Math.round(meta.size / 1024) + ' KB' : 'Uploaded'
                              }`
                            : 'Not uploaded'}
                        </div>

                        {/* Direct Link */}
                        {meta && targetUrl && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-[#0E2F5A] hover:text-[#0A2342] hover:underline inline-flex items-center gap-0.5"
                              title="Open document in new browser tab"
                            >
                              <span>Open ↗</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Verified Checkbox / Placeholder */}
                      <div className="pt-2 border-t border-slate-100">
                        {meta ? (
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isVerified}
                              disabled={docLoading[docDef.k] || isSubmitting}
                              onChange={(e) => handleDocCheck(docDef.k, e.target.checked)}
                              className="rounded border-slate-300 text-[#0A2342] focus:ring-[#0A2342] w-4 h-4 cursor-pointer shrink-0 disabled:opacity-50"
                            />
                            <span className="leading-none flex items-center gap-1.5">
                              <span>Verified</span>
                              {docLoading[docDef.k] && (
                                <span className="w-2.5 h-2.5 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin inline-block" />
                              )}
                            </span>
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
                Not approved{a.reviewNote ? `: ${a.reviewNote}` : '.'}
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



                {/* <div className="space-y-1">
                  <label htmlFor="apNote" className="block text-xs font-bold text-slate-800">
                    Note to the applicant
                  </label>
                  <textarea
                    id="apNote"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Required for changes or rejection, e.g. ID photo is blurry, please upload again."
                    className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2342] resize-none"
                  />
                </div> */}



                {/* Approve & activate Button */}
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!allOk || isSubmitting}
                  className={`w-full h-11 px-4 rounded-lg font-extrabold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 select-none whitespace-nowrap leading-none ${
                    allOk && !isSubmitting
                      ? 'bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] cursor-pointer'
                      : 'bg-[#F6C580] text-[#A67B40] cursor-not-allowed opacity-90'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon name="check" size={17} strokeWidth={2.8} />
                  )}
                  <span>{isSubmitting ? 'Processing...' : 'Approve & activate'}</span>
                </button>

                {/* Bottom Action Buttons: Request changes & Reject */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setModalReason(note.trim());
                      setModalError('');
                      setActionModal('request_changes');
                    }}
                    disabled={isSubmitting}
                    className="h-10 px-2 sm:px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0A2342] font-extrabold text-xs transition cursor-pointer shadow-2xs flex items-center justify-center text-center whitespace-nowrap leading-none select-none disabled:opacity-50"
                  >
                    Request changes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalReason(note.trim());
                      setModalError('');
                      setActionModal('reject');
                    }}
                    disabled={isSubmitting}
                    className="h-10 px-2 sm:px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-[#991B1B] font-extrabold text-xs transition cursor-pointer shadow-2xs flex items-center justify-center text-center whitespace-nowrap leading-none select-none disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center justify-center text-center shadow-2xs select-none"
                >
                  Open Staff list
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 font-bold text-xs transition cursor-pointer flex items-center justify-center text-center shadow-2xs select-none disabled:opacity-50"
                  title="Move back to review"
                >
                  {isSubmitting ? 'Moving...' : 'Move back to review'}
                </button>
              </div>
            )}
          </section>

          {/* Booking Permissions Section - ONLY for approved staff */}
          {st === 'approved' && (
            <section className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-[#0A2342] whitespace-nowrap">
                  Booking Permissions
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                  Approved
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Configure booking privileges for this caregiver in the staff mobile app.
              </p>

              <div className="space-y-2.5 pt-1">
                {/* Radio Option 1: Staff can confirm booking */}
                <div
                  onClick={() => !permLoading && handleTogglePermission('canConfirmBooking', !canConfirm)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                    canConfirm
                      ? 'border-[#0A2342] bg-[#0A2342]/5 ring-1 ring-[#0A2342]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  } ${permLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name={`perm_can_confirm_${a?.id || appId}`}
                      checked={canConfirm}
                      onChange={() => {}}
                      className="w-4 h-4 text-[#0A2342] border-slate-300 focus:ring-[#0A2342] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-0.5 grow min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        Staff can confirm booking
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          canConfirm
                            ? 'text-emerald-700 bg-emerald-100/70 border border-emerald-200'
                            : 'text-slate-400 bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {canConfirm ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Caregiver can accept and confirm incoming visit bookings directly.
                    </p>
                  </div>
                </div>

                {/* Radio Option 2: Staff can re-assign booking */}
                <div
                  onClick={() => !permLoading && handleTogglePermission('canTransferBooking', !canTransfer)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                    canTransfer
                      ? 'border-[#0A2342] bg-[#0A2342]/5 ring-1 ring-[#0A2342]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  } ${permLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="pt-0.5">
                    <input
                      type="radio"
                      name={`perm_can_transfer_${a?.id || appId}`}
                      checked={canTransfer}
                      onChange={() => {}}
                      className="w-4 h-4 text-[#0A2342] border-slate-300 focus:ring-[#0A2342] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-0.5 grow min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        Staff can re-assign booking
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          canTransfer
                            ? 'text-emerald-700 bg-emerald-100/70 border border-emerald-200'
                            : 'text-slate-400 bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {canTransfer ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Caregiver can transfer or re-assign visits to qualified colleagues in the area.
                    </p>
                  </div>
                </div>
              </div>

              {permLoading && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#0A2342] font-semibold pt-1">
                  <span className="w-3 h-3 border-2 border-[#0A2342] border-t-transparent rounded-full animate-spin" />
                  <span>Updating permission...</span>
                </div>
              )}
            </section>
          )}

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

      {/* Modal Popup for Request Changes or Reject */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setActionModal(null);
              setModalError('');
            }
          }}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl border border-slate-200/90 my-auto overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    actionModal === 'reject'
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-amber-50 border-amber-200 text-[#0A2342]'
                  }`}
                >
                  <Icon
                    name={actionModal === 'reject' ? 'cross' : 'edit'}
                    size={18}
                    strokeWidth={2.4}
                  />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#0A2342] leading-tight">
                    {actionModal === 'reject'
                      ? 'Reject Staff Application'
                      : 'Request Changes from Applicant'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Applicant: <strong className="text-slate-800">{a.name}</strong> · {a.role || 'Staff'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    setActionModal(null);
                    setModalError('');
                  }
                }}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = modalReason.trim();
                if (!trimmed) {
                  setModalError(
                    actionModal === 'reject'
                      ? 'Rejection reason is mandatory. Application cannot be rejected without a reason.'
                      : 'Please specify the required changes or re-upload instructions.'
                  );
                  return;
                }
                if (actionModal === 'reject') {
                  executeReject(trimmed);
                } else if (actionModal === 'request_changes') {
                  executeRequestChanges(trimmed);
                }
              }}
              className="p-5 sm:p-6 space-y-4"
            >
              {/* Alert / Guidance Box */}
              <div
                className={`p-3 rounded-lg border text-xs ${
                  actionModal === 'reject'
                    ? 'bg-red-50/70 border-red-200 text-red-800'
                    : 'bg-sky-50/70 border-sky-200 text-sky-900'
                }`}
              >
                {actionModal === 'reject' ? (
                  <p className="leading-relaxed">
                    <strong>Important:</strong> Rejection reason is mandatory and will be saved in history and sent to the applicant. Default reasons are disabled.
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    <strong>Note:</strong> Explain clearly what documents or information need correction so the applicant can re-upload them.
                  </p>
                )}
              </div>

              {/* Textarea Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="modalReasonInput"
                  className="block text-xs font-bold text-slate-800 flex items-center justify-between"
                >
                  <span>
                    {actionModal === 'reject'
                      ? 'Rejection Reason'
                      : 'Changes Required'}
                    <span className="text-red-500 font-extrabold ml-1">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Required</span>
                </label>
                <textarea
                  id="modalReasonInput"
                  rows={4}
                  autoFocus
                  value={modalReason}
                  onChange={(e) => {
                    setModalReason(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  placeholder={
                    actionModal === 'reject'
                      ? 'e.g. Identity verification failed, unverified credentials, incomplete mandatory documents...'
                      : 'e.g. Aadhaar card photo is blurry. Please upload clear front and back pictures with visible name and DOB.'
                  }
                  className={`w-full rounded-lg border p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition resize-none ${
                    modalError
                      ? 'border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500'
                      : 'border-slate-200 focus:ring-1 focus:ring-[#0A2342]'
                  }`}
                />
                {modalError && (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5 pt-0.5 animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block shrink-0" />
                    <span>{modalError}</span>
                  </p>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setActionModal(null);
                    setModalError('');
                  }}
                  className="h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer select-none disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`h-10 px-5 rounded-lg font-extrabold text-xs transition cursor-pointer shadow-sm flex items-center gap-2 select-none disabled:opacity-50 ${
                    actionModal === 'reject'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-[#0A2342] hover:bg-[#0E2F5A] text-white'
                  }`}
                >
                  {isSubmitting && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>
                    {isSubmitting
                      ? 'Processing...'
                      : actionModal === 'reject'
                      ? 'Confirm & Reject'
                      : 'Send Request'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
