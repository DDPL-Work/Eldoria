import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../constants/icons';
import { RiRefreshLine } from 'react-icons/ri';
import { digits, todayISO } from '../../constants/data';

export function Settings({ onShowToast }) {
  const {
    settings,
    put,
    staffCanConfirm,
    loadDemoData,
    resetAllData,
    syncExternalData,
    data
  } = useStore();

  const { user, fetchProfile, updateProfile } = useAuth();

  // Admin Profile form state (Email and Phone only)
  const [profileForm, setProfileForm] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Fetch admin profile via GET /api/v1/admin/profile on mount
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const result = await fetchProfile().unwrap();
        const u = result.user || result.data || result;
        if (isMounted && u) {
          setProfileForm({
            email: u.email || '',
            phone: u.phone || '',
          });
        }
      } catch (err) {
        console.warn('Failed to fetch profile:', err);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [fetchProfile]);

  // Sync if user object updates in Redux store
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Handle Save Admin Profile via PATCH /api/v1/admin/edit/profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const email = profileForm.email.trim().toLowerCase();
    const phone = digits(profileForm.phone);

    if (!email) {
      setProfileError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setProfileError('Please enter a valid email address');
      return;
    }

    if (profileForm.phone.trim() && phone.length !== 10) {
      setProfileError('Please enter a valid 10-digit mobile number');
      return;
    }

    setProfileSaving(true);
    try {
      const payload = {
        email,
        phone: phone || null,
      };
      const res = await updateProfile(payload).unwrap();
      const updatedUser = res.user || res.data || res;
      setProfileSuccess('Admin profile updated successfully');
      onShowToast?.('Admin profile updated successfully');
      if (updatedUser) {
        setProfileForm({
          email: updatedUser.email || email,
          phone: updatedUser.phone || phone,
        });
      }
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to update profile';
      setProfileError(msg);
      onShowToast?.(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const st = (typeof settings === 'function' ? settings() : settings) || {};

  const [form, setForm] = useState({
    phone: st.phone || '',
    whatsapp: st.whatsapp || '',
    heroVideo: st.heroVideo || ''
  });

  React.useEffect(() => {
    setForm({
      phone: st.phone || '',
      whatsapp: st.whatsapp || '',
      heroVideo: st.heroVideo || ''
    });
  }, [st.phone, st.whatsapp, st.heroVideo]);

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);

  const handleSaveContact = (e) => {
    e.preventDefault();
    const p = digits(form.phone);
    const w = digits(form.whatsapp);

    if ((form.phone && p.length !== 10) || (form.whatsapp && w.length !== 10)) {
      onShowToast?.('Please enter valid 10-digit phone numbers');
      return;
    }

    const hv = String(form.heroVideo || '').trim();
    if (hv && !/^https?:\/\/\S+$/i.test(hv)) {
      onShowToast?.('Video link must start with http:// or https://');
      return;
    }

    put('settings', 'app', {
      ...st,
      phone: p,
      whatsapp: w,
      heroVideo: hv
    });

    onShowToast?.('Settings saved');
  };

  const handleToggleStaffConfirm = () => {
    const currentVal = staffCanConfirm();
    put('settings', 'app', {
      ...st,
      staffCanConfirm: !currentVal
    });
    onShowToast?.(
      currentVal
        ? 'Staff can no longer confirm bookings'
        : 'Staff can now confirm and assign bookings'
    );
  };

  const handleExportBackup = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: 'eldoria',
            version: 2,
            exportedAt: new Date().toISOString(),
            data
          },
          null,
          2
        )
      ],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eldoria-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);

    onShowToast?.('Backup downloaded successfully');
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        const importedData = parsed.data || parsed;
        if (!importedData.bookings && !importedData.staff) {
          throw new Error('Invalid format');
        }
        syncExternalData(importedData);
        onShowToast?.('Backup restored successfully');
      } catch (err) {
        onShowToast?.('The selected file is not a valid Eldoria backup');
      }
    };
    r.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmReset = () => {
    resetAllData();
    setConfirmReset(false);
    onShowToast?.('All data cleared');
  };

  const handleConfirmDemo = () => {
    loadDemoData();
    setConfirmDemo(false);
    onShowToast?.('Sample data loaded');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-1.5 w-full max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 font-medium">
          Global care desk configuration, administrator profile, permissions and storage management
        </p>
      </div>

      {/* Admin Profile Form (Email ID & Phone Number) */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-2xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Admin Profile Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Administrator account contact information (Email ID and Phone number).
            </p>
          </div>
          {profileLoading && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <RiRefreshLine className="animate-spin text-sm" />
              <span>Fetching profile...</span>
            </div>
          )}
        </div>

        {profileError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{profileError}</span>
          </div>
        )}

        {profileSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
            <span>✓</span>
            <span>{profileSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Icon name="mail" size={15} />
              </div>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, email: e.target.value });
                  setProfileError('');
                }}
                placeholder="admin@eldoria.care"
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Phone number (10 digits)
            </label>
            <div className="flex rounded-lg border border-slate-200 focus-within:ring-1 focus-within:ring-teal-500 overflow-hidden bg-white">
              <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={profileForm.phone}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, phone: e.target.value });
                  setProfileError('');
                }}
                placeholder="9876543210"
                className="w-full px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={profileSaving}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-60"
        >
          {profileSaving && <RiRefreshLine className="animate-spin text-sm" />}
          <span>{profileSaving ? 'Saving...' : 'Save details'}</span>
        </button>
      </form>

      {/* Global Contact Settings Form */}
      <form
        onSubmit={handleSaveContact}
        className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-2xs space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900">Default Care Desk Contact</h2>
        <p className="text-xs text-slate-500">
          Used on the client app's Call and WhatsApp buttons for any city that does not have its own
          dedicated numbers configured in the Cities tab.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Global Call number (10 digits)
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="9820012345"
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Global WhatsApp number (10 digits)
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="9820012345"
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Background video for headers (optional MP4 URL)
          </label>
          <input
            type="url"
            value={form.heroVideo}
            onChange={(e) => setForm({ ...form, heroVideo: e.target.value })}
            placeholder="https://yourdomain.com/eldoria-care.mp4"
            className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Plays silently behind animated headers on client and staff screens. Leave empty to use
            the built-in gradient animation.
          </p>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
        >
          Save contact settings
        </button>
      </form>

      {/* Staff Confirmation Toggle */}
      {/* <section className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <h2 className="text-sm font-bold text-slate-900">
            Caregivers can confirm &amp; assign bookings
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            When enabled, staff members in the booking's city receive incoming request alerts and can
            confirm visits or accept assignments directly from the Staff mobile app.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={staffCanConfirm()}
          onClick={handleToggleStaffConfirm}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            staffCanConfirm() ? 'bg-teal-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              staffCanConfirm() ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </section> */}

      {/* =====================Backup and Restore =======================================*/}
      {/* <section className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Data &amp; Backup Management</h2>
        <p className="text-xs text-slate-500">
          Export a complete JSON backup of bookings, caregivers, catalog services, cities and
          settings, or restore a backup file created on another machine.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Download backup (.json)
          </button>

          <label className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200">
            Restore backup
            <input type="file" accept=".json,application/json" onChange={handleImportBackup} hidden />
          </label>

          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-600">Delete all records?</span>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs cursor-pointer"
              >
                Delete everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1.5 text-xs text-slate-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition cursor-pointer"
            >
              Reset all data
            </button>
          )}
        </div>
      </section> */}


      {/*===================== Sample Demo Data =======================================*/}
      {/* <section className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Sample Mock Datasets</h2>
        <p className="text-xs text-slate-500">
          Reset and reload the sample bookings, verified staff members, onboarding applications,
          notifications and services catalog.
        </p>

        {confirmDemo ? (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-800">Load sample demo data now?</span>
            <button
              type="button"
              onClick={handleConfirmDemo}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs cursor-pointer"
            >
              Load data
            </button>
            <button
              type="button"
              onClick={() => setConfirmDemo(false)}
              className="px-2.5 py-1.5 text-xs text-slate-500"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDemo(true)}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            Load sample data
          </button>
        )}
      </section> */}
    </div>
  );
}
