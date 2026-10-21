import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon } from '../../constants/icons';
import { DatabaseLoader } from '../common/DatabaseLoader';
import { CityDropdown } from '../common/CityDropdown';
import { FormCityDropdown } from '../common/FormCityDropdown';
import healthcareTeamImg from '../../assets/healthcare-team.png';
import { staffAPI } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import {
  OB_ROLES,
  DEFAULT_CITIES,
  telHref,
  waHref,
  digits,
  ACTIVE
} from '../../constants/data';

export function Staff({ onShowToast }) {
  const navigate = useNavigate();
  const {
    inCity,
    staffList,
    bookingsAll,
    cities,
    cityName,
    put,
    patch,
    remove,
    selectedCity,
    setSelectedCity,
    backendStaffRequests,
    staffRequestsLoading,
    staffRequestsError,
    dataLoading,
    dataError,
    fetchStaffRequests,
    setStaffDutyLocally
  } = useStore();

  const isLoading = Boolean(staffRequestsLoading || dataLoading);
  const errorMsg = staffRequestsError || dataError;

  // Fetch real staff list from backend GET /api/v1/admin/staff-requests
  const loadStaffData = useCallback(() => {
    const params = {
      approval: 'all',
      limit: 50,
    };
    if (selectedCity && selectedCity !== 'all') {
      params.city = selectedCity;
    }
    fetchStaffRequests?.(params);
  }, [fetchStaffRequests, selectedCity]);

  const handleRefresh = () => {
    loadStaffData();
    onShowToast?.('Refreshed staff list');
  };

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  // Map backend staff requests into display staff items with fallback to store
  const list = useMemo(() => {
    if (backendStaffRequests && backendStaffRequests.length > 0) {
      const items = backendStaffRequests.map((s) => {
        const u = s.user || {};
        let skillsStr = '';
        if (Array.isArray(s.skills)) {
          skillsStr = s.skills.join(', ');
        } else if (typeof s.skills === 'string') {
          try {
            const parsed = JSON.parse(s.skills);
            skillsStr = Array.isArray(parsed) ? parsed.join(', ') : s.skills;
          } catch {
            skillsStr = s.skills;
          }
        }

        const id = String(s.staffId || s.id);
        return {
          id,
          backendId: s.id,
          staffId: s.staffId || id,
          name: u.name || s.name || 'Staff Member',
          role: s.qualification || s.role || 'Caregiver',
          phone: u.phone || s.phone || '',
          email: u.email || s.email || '',
          city: (s.city || 'mumbai').toLowerCase().trim(),
          area: s.area || '',
          skills: skillsStr,
          docs: s.docs || 'pending',
          approval: s.approval || 'pending',
          onDuty: Boolean(s.onDuty),
          experience: s.experience || 0,
          regNo: s.regNo || '',
          files: s.files || {},
          raw: s,
        };
      });

      // Filter by selected city if not 'all'
      if (selectedCity && selectedCity !== 'all') {
        const cleanCity = String(selectedCity).toLowerCase().trim();
        return items.filter((s) => String(s.city || '').toLowerCase().trim() === cleanCity);
      }
      return items;
    }

    // Fallback to local memory staff
    return inCity(staffList(), (s) => s.city || DEFAULT_CITIES[0].id);
  }, [backendStaffRequests, selectedCity, inCity, staffList]);
  const allBookings = bookingsAll();

  const busyIds = new Set(
    allBookings
      .filter((b) => ['on_the_way', 'in_progress'].includes(b.status))
      .map((b) => b.staffId)
  );

  const [editingStaff, setEditingStaff] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [dutyLoadingIds, setDutyLoadingIds] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && editingStaff) {
        setEditingStaff(null);
        setConfirmDel(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingStaff]);

  const handleOpenNew = () => {
    setEditingStaff({
      id: null,
      name: '',
      role: 'GNM Nurse',
      phone: '',
      city: selectedCity !== 'all' ? selectedCity : cities()[0]?.id || DEFAULT_CITIES[0].id,
      area: '',
      skills: '',
      docs: 'pending',
      err: ''
    });
    setConfirmDel(null);
  };

  const handleOpenEdit = (s) => {
    setEditingStaff({
      id: s.id,
      name: s.name,
      role: s.role,
      phone: s.phone,
      city: s.city || DEFAULT_CITIES[0].id,
      area: s.area || '',
      skills: s.skills || '',
      docs: s.docs || 'pending',
      err: ''
    });
    setConfirmDel(null);
  };

  const handleDutyToggle = async (s) => {
    const nextStatus = !s.onDuty;
    const staffIdentifier = s.staffId || s.backendId || s.id;
    const toggleKey = String(s.id || staffIdentifier);

    if (dutyLoadingIds[toggleKey]) return;

    // 1. Immediate optimistic update in UI and Redux store
    setStaffDutyLocally?.({ id: s.id, staffId: s.staffId, onDuty: nextStatus });
    patch('staff', s.id, { onDuty: nextStatus });
    setDutyLoadingIds((prev) => ({ ...prev, [toggleKey]: true }));

    try {
      // 2. Integration with backend API: PATCH /api/v1/auth/profile/:id (or /profile/:id)
      // Payload sends boolean value: { onDuty: true / false }
      await staffAPI.toggleStaffDuty(staffIdentifier, nextStatus);

      onShowToast?.(`${s.name.split(' ')[0]} is now ${nextStatus ? 'on duty' : 'off duty'}`);

      // Refresh list to keep everything fully synced
      loadStaffData();
    } catch (err) {
      console.error('Failed to update staff duty status via API:', err);
      // Revert optimistic update on failure
      setStaffDutyLocally?.({ id: s.id, staffId: s.staffId, onDuty: s.onDuty });
      patch('staff', s.id, { onDuty: s.onDuty });
      onShowToast?.(err.message || 'Failed to update duty status on server');
    } finally {
      setDutyLoadingIds((prev) => {
        const next = { ...prev };
        delete next[toggleKey];
        return next;
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const p = digits(editingStaff.phone);

    if (!editingStaff.name.trim() || p.length !== 10) {
      setEditingStaff((prev) => ({
        ...prev,
        err: 'Please enter a valid full name and a 10-digit mobile number.'
      }));
      return;
    }

    const id = editingStaff.id || 's' + Date.now().toString(36);
    const existing = editingStaff.id ? list.find((x) => x.id === editingStaff.id) : null;

    put('staff', id, {
      ...(existing || {}),
      name: editingStaff.name.trim(),
      role: editingStaff.role,
      phone: p,
      city: editingStaff.city,
      area: editingStaff.area.trim(),
      skills: editingStaff.skills.trim(),
      docs: editingStaff.docs,
      onDuty: existing?.onDuty ?? false
    });

    onShowToast?.(editingStaff.id ? 'Staff updated' : 'Staff added');
    setEditingStaff(null);
  };

  const handleDeleteStaff = (id) => {
    const s = list.find((x) => x.id === id);
    remove('staff', id);
    setEditingStaff(null);
    setConfirmDel(null);
    onShowToast?.(`${s?.name || 'Staff'} removed`);
  };

  return (
    <div className="p-3 sm:p-4 w-full space-y-2 sm:space-y-2.5">
      {/* 1. City Dropdown Pill at Top matching Booking & Dashboard */}
      <div className="flex items-center justify-between gap-3">
        <CityDropdown />
      </div>

      {/* Header Row: Title & Count on Left, Actions on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {list.length} staff · {list.filter((s) => s.onDuty).length} on duty
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
          >
            <RiRefreshLine className={`text-sm ${isLoading ? 'animate-spin text-[#0E2F5A]' : 'text-slate-500'}`} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-extrabold text-xs sm:text-sm shadow-xs transition duration-150 cursor-pointer shrink-0"
          >
            <Icon name="plus" size={16} strokeWidth={2.6} />
            <span>Add staff</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {editingStaff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingStaff(null);
              setConfirmDel(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-slate-200/90 my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={handleFormSubmit}
              className="p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#0E2F5A]/10 text-[#0E2F5A] flex items-center justify-center font-bold">
                    <Icon name={editingStaff.id ? 'edit' : 'user'} size={16} />
                  </div>
                  <h2 id="staff-modal-title" className="text-base font-bold text-slate-900">
                    {editingStaff.id ? 'Edit Staff Member' : 'Add New Staff Member'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStaff(null);
                    setConfirmDel(null);
                  }}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition text-sm"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full name *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    placeholder="e.g. Sister Anjali Rao"
                    className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation role</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] cursor-pointer"
                  >
                    {OB_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    placeholder="9820012345"
                    className="w-full rounded-md border border-slate-200 p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City hub</label>
                  <FormCityDropdown
                    value={editingStaff.city}
                    onChange={(city) => setEditingStaff({ ...editingStaff, city })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service area</label>
                  <input
                    type="text"
                    value={editingStaff.area}
                    onChange={(e) => setEditingStaff({ ...editingStaff, area: e.target.value })}
                    placeholder="e.g. Andheri West, Versova"
                    className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Documents status</label>
                  <select
                    value={editingStaff.docs}
                    onChange={(e) => setEditingStaff({ ...editingStaff, docs: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] cursor-pointer"
                  >
                    <option value="pending">Pending verification</option>
                    <option value="verified">Verified (ID &amp; Background)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specialized skills &amp; Experience
                  </label>
                  <input
                    type="text"
                    value={editingStaff.skills}
                    onChange={(e) => setEditingStaff({ ...editingStaff, skills: e.target.value })}
                    placeholder="e.g. Diabetic care, Injections, Ryles tube, Post-stroke care"
                    className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
                  />
                </div>
              </div>

              {editingStaff.err && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-xs font-semibold">
                  {editingStaff.err}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4.5 py-2.5 rounded-md bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
                  >
                    {editingStaff.id ? 'Save changes' : 'Add staff'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStaff(null);
                      setConfirmDel(null);
                    }}
                    className="px-4 py-2.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                </div>

                {editingStaff.id && (
                  <div>
                    {confirmDel === editingStaff.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-bold">Confirm delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(editingStaff.id)}
                          className="px-3 py-1.5 rounded-md bg-red-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDel(null)}
                          className="px-2 py-1.5 text-xs text-slate-500 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDel(editingStaff.id)}
                        className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Remove staff
                      </button>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Table / Empty State Section Card */}
      <section className="bg-white rounded-[12px] border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <DatabaseLoader
            title="Fetching Staff from Database..."
            subtitle="Connecting to Eldoria backend server"
          />
        ) : errorMsg ? (
          <div className="min-h-[480px] lg:min-h-[575px] flex flex-col items-center justify-center p-8 text-center bg-white space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold">
              ✕
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">Failed to load staff data</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {typeof errorMsg === 'string' ? errorMsg : 'An error occurred while connecting to the server.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 bg-[#0E2F5A] text-white text-xs font-bold rounded-lg hover:bg-[#1a4478] transition shadow-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-5 sm:py-6 text-center bg-white h-[calc(100vh-225px)] min-h-[340px] max-h-[560px]">
            {/* 1. Healthcare team illustration */}
            <div className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] h-[150px] sm:h-[175px] md:h-[195px] flex items-center justify-center mb-2.5 sm:mb-3 shrink-0">
              <img
                src={healthcareTeamImg}
                alt="Healthcare Team"
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            </div>

            {/* 2. Main heading */}
            <h2 className="text-xl sm:text-2xl font-bold text-[#0E2F5A] tracking-tight mb-1.5">
              No staff added yet
            </h2>

            {/* 3. Supporting description */}
            <p className="text-xs sm:text-sm text-slate-500 max-w-[580px] mx-auto px-2 leading-relaxed">
              Add your nurses, caregivers and physios so you can assign visits.
              <br className="hidden sm:inline" /> Each staff member can then sign in to the Staff mobile app.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1050px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left min-w-[210px]">Staff member</th>
                  <th scope="col" className="py-3.5 px-3 text-left min-w-[100px]">City</th>
                  <th scope="col" className="py-3.5 px-3 text-left min-w-[220px]">Skills</th>
                  <th scope="col" className="py-3.5 px-3 text-left min-w-[150px]">Area</th>
                  <th scope="col" className="py-3.5 px-3 text-left min-w-[110px]">Documents</th>
                  <th scope="col" className="py-3.5 px-3 text-center min-w-[85px]">On duty</th>
                  <th scope="col" className="py-3.5 px-3 text-left min-w-[125px]">Visits</th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 text-right min-w-[125px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((s) => {
                  const mine = allBookings.filter((b) => b.staffId === s.id);
                  const isBusy = busyIds.has(s.id);
                  const initials = s.name
                    ? s.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'S';

                  const photoUrl =
                    s.photo ||
                    s.files?.photo?.data ||
                    s.files?.photo?.url ||
                    s.raw?.files?.photo?.data ||
                    s.raw?.files?.photo?.url ||
                    null;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      {/* Staff: Avatar + Name + Role - Clicking navigates to Staff Details Page */}
                      <td className="py-3.5 pl-4 pr-3 min-w-[210px]">
                        <button
                          type="button"
                          onClick={() => {
                            const targetId = s.staffId || s.backendId || s.id;
                            navigate(`/staff/${targetId}`);
                          }}
                          className="flex items-center gap-3 text-left group cursor-pointer w-full min-w-0"
                          title={`View details for ${s.name}`}
                        >
                          <div className="w-9 h-9 rounded-full bg-[#FDE8CD] text-[#7A4100] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden relative select-none">
                            {photoUrl && (
                              <img
                                src={photoUrl}
                                alt={s.name}
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
                            )}
                            <span className="font-extrabold text-[#7A4100] text-xs select-none">{initials}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-[#0E2F5A] text-xs sm:text-[13px] truncate">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {s.role}
                              {isBusy && (
                                <span className="ml-1 text-[#F2A01F] font-semibold">· On visit</span>
                              )}
                            </div>
                          </div>
                        </button>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-3 text-xs text-slate-700 font-semibold whitespace-nowrap min-w-[100px]">
                        {cityName(s.city || DEFAULT_CITIES[0].id)}
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-3 text-xs text-slate-600 min-w-[220px]">
                        {s.skills || '—'}
                      </td>

                      {/* Area */}
                      <td className="py-3.5 px-3 text-xs text-slate-600 min-w-[150px]">
                        {s.area || '—'}
                      </td>

                      {/* Documents Status Badge */}
                      <td className="py-3.5 px-3 min-w-[110px]">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            s.docs === 'verified'
                              ? 'bg-[#E8F8EE] text-[#1E7E34]'
                              : 'bg-[#FDF0D9] text-[#8A5000]'
                          }`}
                        >
                          {s.docs === 'verified' ? 'Verified' : 'Pending'}
                        </span>
                      </td>

                      {/* On Duty Toggle Switch */}
                      <td className="py-3.5 px-3 text-center min-w-[85px]">
                        <div className="flex justify-center items-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(s.onDuty)}
                            disabled={Boolean(dutyLoadingIds[String(s.id || s.staffId)])}
                            onClick={() => handleDutyToggle(s)}
                            title={s.onDuty ? 'Click to mark off duty' : 'Click to mark on duty'}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none p-0.5 ${
                              dutyLoadingIds[String(s.id || s.staffId)]
                                ? 'opacity-60 cursor-wait'
                                : ''
                            } ${
                              s.onDuty ? 'bg-[#1E5E41]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                s.onDuty ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Visits */}
                      <td className="py-3.5 px-3 text-xs font-mono text-slate-600 whitespace-nowrap min-w-[125px]">
                        {mine.filter((b) => b.status === 'completed').length} done ·{' '}
                        {mine.filter((b) => ACTIVE.includes(b.status)).length} open
                      </td>

                      {/* Actions Buttons (Edit Modal, Call & WhatsApp) */}
                      <td className="py-3.5 pl-3 pr-4 text-right min-w-[125px]">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-[#0E2F5A] hover:text-white hover:border-[#0E2F5A] flex items-center justify-center transition shadow-2xs cursor-pointer"
                            aria-label={`Edit ${s.name}`}
                            title={`Edit ${s.name}`}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <a
                            href={telHref(s.phone)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition shadow-2xs"
                            aria-label={`Call ${s.name}`}
                            title={`Call ${s.name}`}
                          >
                            <Icon name="phone" size={14} />
                          </a>
                          <a
                            href={waHref(s.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-[#128C4A] hover:bg-[#0e703b] text-white flex items-center justify-center transition shadow-2xs"
                            aria-label={`WhatsApp ${s.name}`}
                            title={`WhatsApp ${s.name}`}
                          >
                            <Icon name="wa" size={15} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
