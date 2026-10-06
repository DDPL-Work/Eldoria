import React, { useState } from 'react';
import { Icon, ICON_CHOICES, P } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { useFiles } from '../../context/FileContext';
import {
  UNITS,
  KINDS,
  priceLabel,
  digits
} from '../../constants/data';

export function Services({ onShowToast }) {
  const {
    catsAll,
    svcAll,
    svcLive,
    svcInCat,
    put,
    patch,
    remove,
    data
  } = useStore();
  const { uploadFile, fileGet } = useFiles();

  const [svcForm, setSvcForm] = useState(null);
  const [catForm, setCatForm] = useState(null);
  const [confirmSvcDel, setConfirmSvcDel] = useState(null);
  const [confirmCatDel, setConfirmCatDel] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);

  const categories = catsAll();
  const allServices = svcAll();
  const liveCount = allServices.filter(svcLive).length;

  const handleOpenNewCat = () => {
    setCatForm({
      id: null,
      name: '',
      desc: '',
      icon: 'cross',
      kind: 'care',
      enabled: true,
      comingSoon: false,
      err: ''
    });
    setSvcForm(null);
    setConfirmCatDel(null);
  };

  const handleOpenEditCat = (c) => {
    setCatForm({
      id: c.id,
      name: c.name,
      desc: c.desc || '',
      icon: c.icon || 'cross',
      kind: c.kind || 'care',
      enabled: c.enabled !== false,
      comingSoon: !!c.comingSoon,
      err: ''
    });
    setSvcForm(null);
    setConfirmCatDel(null);
  };

  const handleOpenNewSvc = (defaultCatId) => {
    const firstCat = defaultCatId || categories[0]?.id || '';
    setSvcForm({
      id: null,
      name: '',
      categoryId: firstCat,
      desc: '',
      icon: 'cross',
      image: null,
      priceMode: 'fixed',
      price: '500',
      unit: 'per visit',
      options: 'Single visit\n12-hr shift\n24-hr live-in',
      tasks: 'Check BP, Sugar & Vitals\nAdminister medication\nMobility support',
      enabled: true,
      err: ''
    });
    setCatForm(null);
    setConfirmSvcDel(null);
  };

  const handleOpenEditSvc = (s) => {
    setSvcForm({
      id: s.id,
      name: s.name,
      categoryId: s.categoryId,
      desc: s.desc || '',
      icon: s.icon || 'cross',
      image: s.image || null,
      priceMode: s.priceMode || (s.price ? 'fixed' : 'contact'),
      price: s.price ? String(s.price) : '',
      unit: s.unit || 'per visit',
      options: (s.options || []).join('\n'),
      tasks: (s.tasks || []).join('\n'),
      enabled: s.enabled !== false,
      err: ''
    });
    setCatForm(null);
    setConfirmSvcDel(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !svcForm) return;
    setImgUploading(true);
    try {
      const uploaded = await uploadFile(file, 600);
      setSvcForm((prev) => ({ ...prev, image: uploaded }));
      onShowToast?.('Image uploaded');
    } catch (err) {
      onShowToast?.(err.message || 'Could not upload image');
    } finally {
      setImgUploading(false);
      e.target.value = '';
    }
  };

  const handleSvcSubmit = (e) => {
    e.preventDefault();
    if (!svcForm.name.trim()) {
      setSvcForm((prev) => ({ ...prev, err: 'Please enter a service name.' }));
      return;
    }
    if (!svcForm.categoryId) {
      setSvcForm((prev) => ({ ...prev, err: 'Please choose a category.' }));
      return;
    }

    const price = parseInt(digits(svcForm.price) || '0', 10);
    if (svcForm.priceMode === 'fixed' && price <= 0) {
      setSvcForm((prev) => ({
        ...prev,
        err: 'Please enter a valid price or choose "Contact for price".'
      }));
      return;
    }

    const lines = (t) =>
      String(t || '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean);

    const id =
      svcForm.id ||
      svcForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30) +
        '-' +
        Date.now().toString(36).slice(-4);

    const cur = data.services[id] || {};
    const order = cur.order || svcInCat(svcForm.categoryId, true).length + 1;

    put('services', id, {
      ...cur,
      name: svcForm.name.trim(),
      categoryId: svcForm.categoryId,
      desc: svcForm.desc.trim(),
      icon: svcForm.icon,
      image: svcForm.image || null,
      priceMode: svcForm.priceMode,
      price: svcForm.priceMode === 'fixed' ? price : 0,
      unit: svcForm.unit,
      options: lines(svcForm.options),
      tasks: lines(svcForm.tasks),
      enabled: !!svcForm.enabled,
      order,
      updatedAt: Date.now()
    });

    onShowToast?.(`${svcForm.id ? 'Saved' : 'Added'} ${svcForm.name.trim()}`);
    setSvcForm(null);
  };

  const handleCatSubmit = (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      setCatForm((prev) => ({ ...prev, err: 'Please enter a category name.' }));
      return;
    }

    const id =
      catForm.id ||
      catForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30) +
        '-' +
        Date.now().toString(36).slice(-4);

    const cur = data.categories[id] || {};
    const order = cur.order || categories.length + 1;

    put('categories', id, {
      ...cur,
      name: catForm.name.trim(),
      desc: catForm.desc.trim(),
      icon: catForm.icon,
      kind: catForm.kind,
      enabled: !!catForm.enabled,
      comingSoon: !!catForm.comingSoon,
      order
    });

    onShowToast?.(`${catForm.id ? 'Saved' : 'Added'} ${catForm.name.trim()}`);
    setCatForm(null);
  };

  const handleMoveCat = (id, dir) => {
    const idx = categories.findIndex((c) => c.id === id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= categories.length) return;

    categories.forEach((c, k) => {
      const want = k === idx ? targetIdx + 1 : k === targetIdx ? idx + 1 : k + 1;
      patch('categories', c.id, { order: want });
    });
  };

  const handleMoveSvc = (cid, id, dir) => {
    const list = svcInCat(cid, true);
    const idx = list.findIndex((s) => s.id === id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return;

    list.forEach((s, k) => {
      const want = k === idx ? targetIdx + 1 : k === targetIdx ? idx + 1 : k + 1;
      patch('services', s.id, { order: want });
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Services &amp; Pricing</h1>
          <p className="text-xs text-slate-500 font-medium">
            {categories.length} categories · {liveCount} of {allServices.length} services live
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNewCat}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            + Category
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewSvc()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
          >
            <Icon name="plus" size={16} strokeWidth={2.5} />
            <span>Add service</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
        <b>Real-time Sync:</b> Catalog modifications go live in the Client and Staff apps instantly.
        No app store build is required to adjust pricing, reorder or publish new offerings.
      </div>

      {/* Category Editor Form Modal */}
      {catForm && (
        <form
          onSubmit={handleCatSubmit}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">
              {catForm.id ? 'Edit Category' : 'Add Category'}
            </h2>
            <button
              type="button"
              onClick={() => setCatForm(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category name *</label>
              <input
                type="text"
                required
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="e.g. Diagnostics at Home"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Service type</label>
              <select
                value={catForm.kind}
                onChange={(e) => setCatForm({ ...catForm, kind: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 cursor-pointer"
              >
                {KINDS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={catForm.desc}
              onChange={(e) => setCatForm({ ...catForm, desc: e.target.value })}
              placeholder="Short description displayed under category title"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Category icon</label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
              {ICON_CHOICES.map((icName) => (
                <button
                  key={icName}
                  type="button"
                  onClick={() => setCatForm({ ...catForm, icon: icName })}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    catForm.icon === icName
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Icon name={icName} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={catForm.enabled}
                onChange={(e) => setCatForm({ ...catForm, enabled: e.target.checked })}
                className="rounded text-teal-600"
              />
              <span>Show category in client app</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={catForm.comingSoon}
                onChange={(e) => setCatForm({ ...catForm, comingSoon: e.target.checked })}
                className="rounded text-amber-500"
              />
              <span>Mark as “Coming Soon” (preview without bookings)</span>
            </label>
          </div>

          {catForm.err && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
              {catForm.err}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {catForm.id ? 'Save category' : 'Add category'}
              </button>
              <button
                type="button"
                onClick={() => setCatForm(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {catForm.id && (
              <div>
                {confirmCatDel === catForm.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 font-bold">Delete category?</span>
                    <button
                      type="button"
                      onClick={() => {
                        remove('categories', catForm.id);
                        setCatForm(null);
                        setConfirmCatDel(null);
                        onShowToast?.('Category deleted');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCatDel(null)}
                      className="text-xs text-slate-500 px-2"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCatDel(catForm.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    Delete category
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {/* Service Editor Form Modal */}
      {svcForm && (
        <form
          onSubmit={handleSvcSubmit}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">
              {svcForm.id ? 'Edit Service' : 'Add Service'}
            </h2>
            <button
              type="button"
              onClick={() => setSvcForm(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Service title *</label>
              <input
                type="text"
                required
                value={svcForm.name}
                onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
                placeholder="e.g. Tracheostomy &amp; Critical Care"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={svcForm.categoryId}
                onChange={(e) => setSvcForm({ ...svcForm, categoryId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description (displayed to client)
            </label>
            <textarea
              rows={2}
              value={svcForm.desc}
              onChange={(e) => setSvcForm({ ...svcForm, desc: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900"
            />
          </div>

          {/* Icon or Image Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Service Icon or Image</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center overflow-hidden shrink-0">
                {svcForm.image && fileGet(svcForm.image.id)?.data ? (
                  <img
                    src={fileGet(svcForm.image.id).data}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon name={P[svcForm.icon] ? svcForm.icon : 'cross'} size={24} className="text-teal-800" />
                )}
              </div>

              <div className="space-y-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition">
                  <Icon name="image" size={15} />
                  <span>{imgUploading ? 'Uploading…' : 'Upload photo'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                </label>
                {svcForm.image && (
                  <button
                    type="button"
                    onClick={() => setSvcForm({ ...svcForm, image: null })}
                    className="ml-2 text-xs text-red-600 hover:underline font-bold"
                  >
                    Remove photo
                  </button>
                )}
                <p className="text-[11px] text-slate-400">Photos replace SVG icon in the app view.</p>
              </div>
            </div>

            {/* Icon Picker Choice List */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
              {ICON_CHOICES.map((icName) => (
                <button
                  key={icName}
                  type="button"
                  onClick={() => setSvcForm({ ...svcForm, icon: icName, image: null })}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    svcForm.icon === icName && !svcForm.image
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <Icon name={icName} size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Pricing configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">Pricing Mode</label>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              <button
                type="button"
                onClick={() => setSvcForm({ ...svcForm, priceMode: 'fixed' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  svcForm.priceMode === 'fixed'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Fixed price
              </button>
              <button
                type="button"
                onClick={() => setSvcForm({ ...svcForm, priceMode: 'contact' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  svcForm.priceMode !== 'fixed'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Contact for price
              </button>
            </div>

            {svcForm.priceMode === 'fixed' && (
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={svcForm.price}
                    onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Charged unit</label>
                  <select
                    value={svcForm.unit}
                    onChange={(e) => setSvcForm({ ...svcForm, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 cursor-pointer"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Options & Tasks Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Booking options (one per line)
              </label>
              <textarea
                rows={3}
                value={svcForm.options}
                onChange={(e) => setSvcForm({ ...svcForm, options: e.target.value })}
                placeholder="Single visit&#10;12-hr shift&#10;24-hr live-in"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Caregiver visit checklist (one per line)
              </label>
              <textarea
                rows={3}
                value={svcForm.tasks}
                onChange={(e) => setSvcForm({ ...svcForm, tasks: e.target.value })}
                placeholder="Vital signs check&#10;Injections &amp; IV support&#10;Bed mobility"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={svcForm.enabled}
              onChange={(e) => setSvcForm({ ...svcForm, enabled: e.target.checked })}
              className="rounded text-teal-600"
            />
            <span>Show this service in the client app</span>
          </label>

          {svcForm.err && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
              {svcForm.err}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {svcForm.id ? 'Save service' : 'Add service'}
              </button>
              <button
                type="button"
                onClick={() => setSvcForm(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {svcForm.id && (
              <div>
                {confirmSvcDel === svcForm.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 font-bold">Delete service?</span>
                    <button
                      type="button"
                      onClick={() => {
                        remove('services', svcForm.id);
                        setSvcForm(null);
                        setConfirmSvcDel(null);
                        onShowToast?.('Service deleted');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSvcDel(null)}
                      className="text-xs text-slate-500 px-2"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSvcDel(svcForm.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    Delete service
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {/* Catalog Display: Categories and their Services */}
      <div className="space-y-6">
        {categories.map((c, ci) => {
          const list = svcInCat(c.id, true);

          return (
            <section
              key={c.id}
              className={`bg-white rounded-2xl border transition overflow-hidden ${
                c.enabled === false ? 'opacity-70 border-slate-200' : 'border-slate-200/80 shadow-2xs'
              }`}
            >
              {/* Category Header */}
              <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                    <Icon name={P[c.icon] ? c.icon : 'cross'} size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">{c.name}</span>
                      {c.comingSoon && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Coming soon
                        </span>
                      )}
                      {c.enabled === false && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.desc || 'No description'} · {list.length} service{list.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {/* Category Action Controls */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleMoveCat(c.id, -1)}
                    disabled={ci === 0}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 transition cursor-pointer"
                    aria-label={`Move ${c.name} up`}
                  >
                    <Icon name="up" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCat(c.id, 1)}
                    disabled={ci === categories.length - 1}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 transition cursor-pointer"
                    aria-label={`Move ${c.name} down`}
                  >
                    <Icon name="down" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditCat(c)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewSvc(c.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 font-bold text-xs transition cursor-pointer"
                  >
                    + Service
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.enabled !== false}
                    onClick={() => {
                      patch('categories', c.id, { enabled: c.enabled === false });
                      onShowToast?.(`${c.name} is ${c.enabled === false ? 'now live' : 'hidden'}`);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      c.enabled !== false ? 'bg-teal-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        c.enabled !== false ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Service Rows */}
              <div className="divide-y divide-slate-100">
                {list.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400">
                    No services in this category yet. Click "+ Service" above to add one.
                  </div>
                ) : (
                  list.map((s, si) => (
                    <div
                      key={s.id}
                      className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition ${
                        s.enabled === false ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {s.image && fileGet(s.image.id)?.data ? (
                            <img
                              src={fileGet(s.image.id).data}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon name={P[s.icon] ? s.icon : 'cross'} size={16} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {s.name}
                            {s.enabled === false && (
                              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-md">
                            {s.desc || 'No description'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                          {priceLabel(s)}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSvc(c.id, s.id, -1)}
                            disabled={si === 0}
                            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 transition cursor-pointer"
                          >
                            <Icon name="up" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSvc(c.id, s.id, 1)}
                            disabled={si === list.length - 1}
                            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 transition cursor-pointer"
                          >
                            <Icon name="down" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSvc(s)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={s.enabled !== false}
                            onClick={() => {
                              patch('services', s.id, { enabled: s.enabled === false });
                              onShowToast?.(`${s.name} is ${s.enabled === false ? 'now live' : 'hidden'}`);
                            }}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              s.enabled !== false ? 'bg-teal-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                s.enabled !== false ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
