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
    selectedCity
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff</h1>
          <p className="text-xs text-slate-500 font-medium">
            {list.length} total caregivers · {list.filter((s) => s.onDuty).length} currently on duty
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition duration-150 self-start sm:self-auto cursor-pointer"
        >
          <Icon name="plus" size={16} strokeWidth={2.5} />
          <span>Add staff</span>
        </button>
      </div>

      {/* Add / Edit Staff Drawer Form Modal */}
      {editingStaff && (
        <form
          onSubmit={handleFormSubmit}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Full name *</label>
              <input
                type="text"
                required
                value={editingStaff.name}
                onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                placeholder="e.g. Sister Anjali Rao"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation role</label>
              <select
                value={editingStaff.role}
                onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                {OB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
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
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City hub</label>
              <select
                value={editingStaff.city}
                onChange={(e) => setEditingStaff({ ...editingStaff, city: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                {cities().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Service area</label>
              <input
                type="text"
                value={editingStaff.area}
                onChange={(e) => setEditingStaff({ ...editingStaff, area: e.target.value })}
                placeholder="e.g. Andheri West, Versova"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Documents status</label>
              <select
                value={editingStaff.docs}
                onChange={(e) => setEditingStaff({ ...editingStaff, docs: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="pending">Pending verification</option>
                <option value="verified">Verified (ID &amp; Background)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Specialized skills &amp; Experience
              </label>
              <input
                type="text"
                value={editingStaff.skills}
                onChange={(e) => setEditingStaff({ ...editingStaff, skills: e.target.value })}
                placeholder="e.g. Diabetic care, Injections, Ryles tube, Post-stroke care"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
              >
                {editingStaff.id ? 'Save changes' : 'Add staff member'}
              </button>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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

      {/* Staff Table */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <p className="font-bold text-slate-700 text-sm">No staff added yet</p>
            <p className="text-xs max-w-sm mx-auto">
              Add your nurses, caregivers and physios so you can assign visits. Each staff member can
              then sign in to the Staff mobile app.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Staff member</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Skills</th>
                  <th className="py-3.5 px-4">Area</th>
                  <th className="py-3.5 px-4">Documents</th>
                  <th className="py-3.5 px-4">On duty</th>
                  <th className="py-3.5 px-4">Visits</th>
                  <th className="py-3.5 px-4 text-right">Contact</th>
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
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="flex items-center gap-3 text-left group cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 border border-teal-200">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-teal-700">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {s.role}
                              {isBusy && (
                                <span className="ml-1 text-amber-600 font-semibold">· On visit</span>
                              )}
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {cityName(s.city || DEFAULT_CITIES[0].id)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {s.skills || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{s.area || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            s.docs === 'verified'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {s.docs === 'verified' ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!s.onDuty}
                          onClick={() => handleDutyToggle(s)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            s.onDuty ? 'bg-teal-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              s.onDuty ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                        {mine.filter((b) => b.status === 'completed').length} done ·{' '}
                        {mine.filter((b) => ACTIVE.includes(b.status)).length} open
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={telHref(s.phone)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            aria-label={`Call ${s.name}`}
                          >
                            <Icon name="phone" size={15} />
                          </a>
                          <a
                            href={waHref(s.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
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
