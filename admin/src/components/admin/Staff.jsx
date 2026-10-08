import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
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
    setSelectedCity
  } = useStore();

  const list = inCity(staffList(), (s) => s.city || DEFAULT_CITIES[0].id);
  const allBookings = bookingsAll();

  const busyIds = new Set(
    allBookings
      .filter((b) => ['on_the_way', 'in_progress'].includes(b.status))
      .map((b) => b.staffId)
  );

  const [editingStaff, setEditingStaff] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

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

  const handleDutyToggle = (s) => {
    patch('staff', s.id, { onDuty: !s.onDuty });
    onShowToast?.(`${s.name.split(' ')[0]} is ${!s.onDuty ? 'on duty' : 'off duty'}`);
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
    <div className="p-4 sm:p-4 w-full space-y-3">
      {/* City Dropdown at Top matching Reference Screenshot */}
      <div className="flex items-center gap-2 self-start bg-white border border-slate-200/90 rounded-lg px-3 py-1 shadow-2xs w-fit">
        <Icon name="pin" size={15} className="text-slate-500" />
        <span className="text-xs font-semibold text-slate-500">City</span>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer py-1 pr-1"
        >
          <option value="all">All cities</option>
          {cities().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Header Row: Title & Count on Left, Add Staff Button on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {list.length} staff · {list.filter((s) => s.onDuty).length} on duty
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-extrabold text-xs sm:text-sm shadow-xs transition duration-150 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Icon name="plus" size={16} strokeWidth={2.6} />
          <span>Add staff</span>
        </button>
      </div>

      {/* Add / Edit Staff Drawer Form Modal */}
      {editingStaff && (
        <form
          onSubmit={handleFormSubmit}
          className="bg-white rounded-lg p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              {editingStaff.id ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <button
              type="button"
              onClick={() => setEditingStaff(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕ Cancel
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
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation role</label>
              <select
                value={editingStaff.role}
                onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] cursor-pointer"
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
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City hub</label>
              <select
                value={editingStaff.city}
                onChange={(e) => setEditingStaff({ ...editingStaff, city: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] cursor-pointer"
              >
                {cities().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service area</label>
              <input
                type="text"
                value={editingStaff.area}
                onChange={(e) => setEditingStaff({ ...editingStaff, area: e.target.value })}
                placeholder="e.g. Andheri West, Versova"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Documents status</label>
              <select
                value={editingStaff.docs}
                onChange={(e) => setEditingStaff({ ...editingStaff, docs: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A] cursor-pointer"
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
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0E2F5A]"
              />
            </div>
          </div>

          {editingStaff.err && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
              {editingStaff.err}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4.5 py-2.5 rounded-xl bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
              >
                {editingStaff.id ? 'Save changes' : 'Add staff'}
              </button>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer shadow-2xs"
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
                      className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(null)}
                      className="px-2 py-1.5 text-xs text-slate-500"
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
      )}

      {/* Staff Table Section */}
      <section className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <p className="font-bold text-slate-700 text-sm">No staff added yet</p>
            <p className="text-xs max-w-sm mx-auto">
              Add your nurses, caregivers and physios so you can assign visits. Each staff member can
              then sign in to the Staff mobile app.
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
                  <th scope="col" className="py-3.5 pl-3 pr-4 text-right min-w-[95px]">Contact</th>
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

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      {/* Staff: Avatar + Name + Role */}
                      <td className="py-3.5 pl-4 pr-3 min-w-[210px]">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="flex items-center gap-3 text-left group cursor-pointer w-full min-w-0"
                        >
                          <div className="w-9 h-9 rounded-full bg-[#FDE8CD] text-[#7A4100] font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
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
                        <div className="flex justify-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!!s.onDuty}
                            onClick={() => handleDutyToggle(s)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none p-0.5 ${
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

                      {/* Contact Buttons (Call & WhatsApp) */}
                      <td className="py-3.5 pl-3 pr-4 text-right min-w-[95px]">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={telHref(s.phone)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition shadow-2xs"
                            aria-label={`Call ${s.name}`}
                          >
                            <Icon name="phone" size={14} />
                          </a>
                          <a
                            href={waHref(s.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-[#128C4A] hover:bg-[#0e703b] text-white flex items-center justify-center transition shadow-2xs"
                            aria-label={`WhatsApp ${s.name}`}
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
