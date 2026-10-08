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
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-3">
      {/* 1. Top Header Row: Title on Left, Count & Actions on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Services</h1>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {categories.length} categories · {liveCount} of {allServices.length} services live
          </span>

          <button
            type="button"
            onClick={handleOpenNewCat}
            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition cursor-pointer select-none leading-none whitespace-nowrap"
          >
            <Icon name="plus" size={15} strokeWidth={2.4} />
            <span>Add category</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNewSvc()}
            className="h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-bold text-xs shadow-2xs transition cursor-pointer select-none leading-none whitespace-nowrap"
          >
            <Icon name="plus" size={15} strokeWidth={2.6} />
            <span>Add service</span>
          </button>
        </div>
      </div>

      {/* 2. Notice Banner Matching Reference Image 1 */}
      <div className="p-3 px-4 rounded-lg bg-[#E3F4EA] border border-transparent text-[#1E6B42] text-xs font-semibold">
        Changes go live in the client and staff apps instantly. No app update is needed to add, edit, hide or reorder services.
      </div>

      {/* Category Editor Form Modal */}
      {catForm && (
        <form
          onSubmit={handleCatSubmit}
          className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-[#0A2342] shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#0A2342]">
              {catForm.id ? 'Edit category' : 'Add category'}
            </h2>
            <button
              type="button"
              onClick={() => setCatForm(null)}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Category name</label>
              <input
                type="text"
                required
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="e.g. Diagnostics at Home"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Type</label>
              <select
                value={catForm.kind}
                onChange={(e) => setCatForm({ ...catForm, kind: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342] cursor-pointer"
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Description</label>
            <input
              type="text"
              value={catForm.desc}
              onChange={(e) => setCatForm({ ...catForm, desc: e.target.value })}
              placeholder="Daily care, company and supervision for senior citizens."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342]"
            />
          </div>

          <div>
            <label className="block text-sm font-extrabold text-[#0A2342] mb-2.5">Icon</label>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {ICON_CHOICES.map((icName) => (
                <button
                  key={icName}
                  type="button"
                  onClick={() => setCatForm({ ...catForm, icon: icName })}
                  aria-pressed={catForm.icon === icName}
                  aria-label={icName}
                  title={icName}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                    catForm.icon === icName
                      ? 'border-2 border-[#0A2342] bg-[#E4ECF7] text-[#0A2342]'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon name={icName} size={20} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={catForm.enabled}
                onChange={(e) => setCatForm({ ...catForm, enabled: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 accent-[#1E6B42] text-[#1E6B42] cursor-pointer"
              />
              <span>Show this category in the client app</span>
            </label>

            <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={catForm.comingSoon}
                onChange={(e) => setCatForm({ ...catForm, comingSoon: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 accent-[#1E6B42] text-[#1E6B42] cursor-pointer"
              />
              <span>Mark as “Coming soon” (visible, but clients can't book yet)</span>
            </label>
          </div>

          {catForm.err && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {catForm.err}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-bold text-sm transition cursor-pointer shadow-2xs"
              >
                {catForm.id ? 'Save category' : 'Add category'}
              </button>
              <button
                type="button"
                onClick={() => setCatForm(null)}
                className="h-10 px-5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {catForm.id && (
              <div>
                {confirmCatDel === catForm.id ? (
                  <div className="inline-flex items-center gap-2 p-1.5 px-3 rounded-lg bg-red-50 border border-red-200 text-xs">
                    <span className="text-red-700 font-bold">Delete this category?</span>
                    <button
                      type="button"
                      onClick={() => {
                        remove('categories', catForm.id);
                        setCatForm(null);
                        setConfirmCatDel(null);
                        onShowToast?.('Category deleted');
                      }}
                      className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCatDel(null)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-800 font-semibold text-xs cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCatDel(catForm.id)}
                    className="h-10 px-4 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-[#C0392B] font-bold text-sm inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Icon name="trash" size={15} />
                    <span>Delete category</span>
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
          className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-[#0A2342] shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#0A2342]">
              {svcForm.id ? 'Edit service' : 'Add service'}
            </h2>
            <button
              type="button"
              onClick={() => setSvcForm(null)}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Service name</label>
              <input
                type="text"
                required
                value={svcForm.name}
                onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
                placeholder="e.g. Senior Citizen Care"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
              <select
                value={svcForm.categoryId}
                onChange={(e) => setSvcForm({ ...svcForm, categoryId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342] cursor-pointer"
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Description (shown to clients)
            </label>
            <textarea
              rows={3}
              value={svcForm.desc}
              onChange={(e) => setSvcForm({ ...svcForm, desc: e.target.value })}
              placeholder="All-round daily support for senior citizens at home."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342]"
            />
          </div>

          {/* Image or Icon Section */}
          <div>
            <label className="block text-sm font-extrabold text-[#0A2342] mb-2.5">
              Image or icon
            </label>
            <div className="flex items-center gap-3.5 flex-wrap mb-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EEF5FC] border border-slate-200 text-[#0A2342] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                {svcForm.image && fileGet(svcForm.image.id)?.data ? (
                  <img
                    src={fileGet(svcForm.image.id).data}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon
                    name={P[svcForm.icon] ? svcForm.icon : 'cross'}
                    size={26}
                    strokeWidth={2}
                    className="text-[#0A2342]"
                  />
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <label className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs">
                  <Icon name="image" size={15} />
                  <span>{imgUploading ? 'Uploading…' : svcForm.image ? 'Change image' : 'Upload image'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                </label>
                {svcForm.image && (
                  <button
                    type="button"
                    onClick={() => setSvcForm({ ...svcForm, image: null })}
                    className="h-9 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-[#C0392B] font-bold text-xs transition cursor-pointer"
                  >
                    Remove image
                  </button>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  An image replaces the icon. Square photos work best.
                </span>
              </div>
            </div>

            {/* Icon Picker Choice List */}
            <div className="flex flex-wrap gap-2 pt-1">
              {ICON_CHOICES.map((icName) => (
                <button
                  key={icName}
                  type="button"
                  onClick={() => setSvcForm({ ...svcForm, icon: icName, image: null })}
                  aria-pressed={svcForm.icon === icName && !svcForm.image}
                  aria-label={icName}
                  title={icName}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                    svcForm.icon === icName && !svcForm.image
                      ? 'border-2 border-[#0A2342] bg-[#E4ECF7] text-[#0A2342]'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon name={icName} size={20} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>

          {/* Pricing configuration */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-sm font-extrabold text-[#0A2342]">Price</label>
            <div className="grid grid-cols-2 max-w-[340px] p-1 rounded-xl bg-[#EEF5FC] gap-1">
              <button
                type="button"
                onClick={() => setSvcForm({ ...svcForm, priceMode: 'fixed' })}
                className={`h-9 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center ${
                  svcForm.priceMode === 'fixed'
                    ? 'bg-white text-[#0A2342] shadow-2xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 font-bold'
                }`}
              >
                Set a price
              </button>
              <button
                type="button"
                onClick={() => setSvcForm({ ...svcForm, priceMode: 'contact' })}
                className={`h-9 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center ${
                  svcForm.priceMode !== 'fixed'
                    ? 'bg-white text-[#0A2342] shadow-2xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 font-bold'
                }`}
              >
                Contact for price
              </button>
            </div>

            {svcForm.priceMode === 'fixed' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={svcForm.price}
                    onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })}
                    placeholder="500"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Charged</label>
                  <select
                    value={svcForm.unit}
                    onChange={(e) => setSvcForm({ ...svcForm, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342] cursor-pointer"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-medium pt-0.5">
                Clients see “Contact for price” and the care desk confirms the price.
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
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]"
              />
              <div className="text-[11px] text-slate-500 font-medium mt-1">
                Shown as choices when the client books, e.g. shifts, sessions or rent / buy.
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Staff checklist (one per line)
              </label>
              <textarea
                rows={3}
                value={svcForm.tasks}
                onChange={(e) => setSvcForm({ ...svcForm, tasks: e.target.value })}
                placeholder="Personal hygiene&#10;Meals & hydration&#10;Assisted walk"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342]"
              />
              <div className="text-[11px] text-slate-500 font-medium mt-1">
                Care tasks the nurse or caregiver ticks off during the visit.
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={svcForm.enabled}
              onChange={(e) => setSvcForm({ ...svcForm, enabled: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 accent-[#1E6B42] text-[#1E6B42] cursor-pointer"
            />
            <span>Show this service in the client app</span>
          </label>

          {svcForm.err && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {svcForm.err}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] text-[#0A2342] font-bold text-sm transition cursor-pointer shadow-2xs"
              >
                {svcForm.id ? 'Save service' : 'Add service'}
              </button>
              <button
                type="button"
                onClick={() => setSvcForm(null)}
                className="h-10 px-5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {svcForm.id && (
              <div>
                {confirmSvcDel === svcForm.id ? (
                  <div className="inline-flex items-center gap-2 p-1.5 px-3 rounded-lg bg-red-50 border border-red-200 text-xs">
                    <span className="text-red-700 font-bold">Delete service?</span>
                    <button
                      type="button"
                      onClick={() => {
                        remove('services', svcForm.id);
                        setSvcForm(null);
                        setConfirmSvcDel(null);
                        onShowToast?.('Service deleted');
                      }}
                      className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSvcDel(null)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-800 font-semibold text-xs cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSvcDel(svcForm.id)}
                    className="h-10 px-4 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-[#C0392B] font-bold text-sm inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Icon name="trash" size={15} />
                    <span>Delete service</span>
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
          const kindObj = KINDS.find((k) => k[0] === (c.kind || 'care')) || KINDS[0];
          const kindLabel = kindObj[1].split(' (')[0];

          return (
            <section
              key={c.id}
              className={`bg-white rounded-lg border transition overflow-hidden ${
                c.enabled === false ? 'opacity-70 border-slate-200' : 'border-slate-200/90 shadow-2xs'
              }`}
            >
              {/* Category Header Bar */}
              <div className="p-4 sm:p-5 bg-[#EEF5FC] border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#E0EEFB] text-[#0E2F5A] flex items-center justify-center shrink-0">
                    <Icon name={P[c.icon] ? c.icon : 'cross'} size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-base">{c.name}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0EDFA] text-[#0A2342] whitespace-nowrap">
                        {kindLabel}
                      </span>
                      {c.comingSoon && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF0D9] text-[#8A5000] whitespace-nowrap">
                          Coming soon
                        </span>
                      )}
                      {c.enabled === false && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 whitespace-nowrap">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      {c.desc ? `${c.desc} · ` : ''}{list.length} service{list.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {/* Category Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleMoveCat(c.id, -1)}
                    disabled={ci === 0}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-slate-600 flex items-center justify-center transition shadow-2xs cursor-pointer"
                    aria-label={`Move ${c.name} up`}
                  >
                    <Icon name="up" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCat(c.id, 1)}
                    disabled={ci === categories.length - 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-slate-600 flex items-center justify-center transition shadow-2xs cursor-pointer"
                    aria-label={`Move ${c.name} down`}
                  >
                    <Icon name="down" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditCat(c)}
                    className="h-8 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer whitespace-nowrap select-none leading-none"
                  >
                    <Icon name="edit" size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewSvc(c.id)}
                    className="h-8 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer whitespace-nowrap select-none leading-none"
                  >
                    <Icon name="plus" size={14} strokeWidth={2.4} />
                    <span>Service</span>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.enabled !== false}
                    onClick={() => {
                      patch('categories', c.id, { enabled: c.enabled === false });
                      onShowToast?.(`${c.name} is ${c.enabled === false ? 'now live' : 'hidden'}`);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                      c.enabled !== false ? 'bg-[#1E6B42]' : 'bg-[#DCE3EC]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        c.enabled !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Service Rows */}
              <div className="divide-y divide-slate-100">
                {list.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400">
                    No services in this category yet. Click “+ Service” above to add one.
                  </div>
                ) : (
                  list.map((s, si) => (
                    <div
                      key={s.id}
                      className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition ${
                        s.enabled === false ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#EAF2FB] text-[#0E2F5A] flex items-center justify-center shrink-0 overflow-hidden">
                          {s.image && fileGet(s.image.id)?.data ? (
                            <img
                              src={fileGet(s.image.id).data}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon name={P[s.icon] ? s.icon : 'cross'} size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {s.name}
                            {s.enabled === false && (
                              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-normal truncate max-w-lg mt-0.5">
                            {s.desc || 'No description'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-slate-900 text-xs sm:text-xs whitespace-nowrap">
                          {priceLabel(s)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveSvc(c.id, s.id, -1)}
                            disabled={si === 0}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-slate-600 flex items-center justify-center transition shadow-2xs cursor-pointer"
                            aria-label={`Move ${s.name} up`}
                          >
                            <Icon name="up" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSvc(c.id, s.id, 1)}
                            disabled={si === list.length - 1}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-slate-600 flex items-center justify-center transition shadow-2xs cursor-pointer"
                            aria-label={`Move ${s.name} down`}
                          >
                            <Icon name="down" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSvc(s)}
                            className="h-7 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer whitespace-nowrap select-none leading-none"
                          >
                            <Icon name="edit" size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={s.enabled !== false}
                            onClick={() => {
                              patch('services', s.id, { enabled: s.enabled === false });
                              onShowToast?.(`${s.name} is ${s.enabled === false ? 'now live' : 'hidden'}`);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                              s.enabled !== false ? 'bg-[#1E6B42]' : 'bg-[#DCE3EC]'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                s.enabled !== false ? 'translate-x-5' : 'translate-x-0'
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
