import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RiRefreshLine } from 'react-icons/ri';
import { Icon, ICON_CHOICES, P } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import { useFiles } from '../../context/FileContext';
import { DatabaseLoader } from '../common/DatabaseLoader';
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
    data,
    // Backend service & category API triggers & state
    backendServices,
    backendCategories,
    servicesSummary,
    servicesLoading,
    servicesError,
    serviceActionLoading,
    serviceActionError,
    fetchServices,
    fetchServiceById,
    createService,
    updateService,
    toggleServiceStatus,
    reorderServices,
    deleteService,
    createCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    citiesAll,
    cities,
    cityName,
    backendCities,
    fetchCities,
    selectedCity,
  } = useStore();
  const { uploadFile, fileGet } = useFiles();

  const [svcForm, setSvcForm] = useState(null);
  const [catForm, setCatForm] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('service'); // 'service' | 'category'
  const [isEditMode, setIsEditMode] = useState(false);
  const [confirmSvcDel, setConfirmSvcDel] = useState(null);
  const [confirmCatDel, setConfirmCatDel] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial and manual fetch of services catalog from backend API (GET /api/v1/admin/services)
  const loadServicesData = useCallback(() => {
    fetchServices?.();
  }, [fetchServices]);

  useEffect(() => {
    loadServicesData();
    fetchCities?.();
  }, [loadServicesData, fetchCities]);

  const handleRefresh = () => {
    loadServicesData();
    fetchCities?.();
    onShowToast?.('Refreshed services catalog');
  };

  const categories = catsAll();
  const allServices = svcAll();
  const liveCount = allServices.filter(svcLive).length;

  // Operational cities from store & backend
  const availableCities = React.useMemo(() => {
    const storeCities = typeof citiesAll === 'function' ? citiesAll() : (typeof cities === 'function' ? cities() : []);
    const map = new Map();
    if (Array.isArray(backendCities) && backendCities.length > 0) {
      backendCities.forEach((c) => {
        const id = c.cityId || c.id;
        if (id) map.set(String(id).toLowerCase(), { id, name: c.name || id });
      });
    }
    storeCities.forEach((c) => {
      const id = c.id || c.cityId;
      if (id && !map.has(String(id).toLowerCase())) {
        map.set(String(id).toLowerCase(), { id, name: c.name || id });
      }
    });
    return Array.from(map.values());
  }, [citiesAll, cities, backendCities]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSvcForm(null);
    setCatForm(null);
    setConfirmSvcDel(null);
    setConfirmCatDel(null);
    setIsEditMode(false);
  };

  // Keyboard Escape listener & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalOpen) {
        handleCloseModal();
      }
    };
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  // Open Unified Modal for Adding (Service or Category)
  const handleOpenAddModal = (tab = 'service', defaultCatId = '') => {
    const firstCat = defaultCatId || categories[0]?.id || '';
    const defaultCityId = selectedCity !== 'all' ? selectedCity : (availableCities[0]?.id || '');
    setSvcForm({
      id: null,
      name: '',
      categoryId: firstCat,
      city: defaultCityId,
      desc: '',
      icon: 'cross',
      image: null,
      priceMode: 'fixed',
      price: '500',
      unit: 'per visit',
      options: 'Single visit\n12-hr shift\n24-hr live-in',
      tasks: 'Check BP, Sugar & Vitals\nAdminister medication\nMobility support',
      enabled: true,
      comingSoon: false,
      err: ''
    });
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
    setModalTab(tab);
    setIsEditMode(false);
    setConfirmSvcDel(null);
    setConfirmCatDel(null);
    setModalOpen(true);
  };

  const handleOpenEditCat = (c) => {
    setCatForm({
      id: c.id,
      origName: c.name || c.id,
      name: c.name,
      desc: c.desc || '',
      icon: c.icon || 'cross',
      kind: c.kind || 'care',
      enabled: c.enabled !== false,
      comingSoon: !!c.comingSoon,
      err: ''
    });
    setModalTab('category');
    setIsEditMode(true);
    setConfirmCatDel(null);
    setConfirmSvcDel(null);
    setModalOpen(true);
  };

  const handleOpenEditSvc = (s) => {
    setSvcForm({
      id: s.id,
      backendId: s.backendId || s.id,
      name: s.name,
      categoryId: s.categoryId || s.category,
      city: s.city || s.cityId || '',
      desc: s.desc || '',
      icon: s.icon || 'cross',
      image: s.image || null,
      priceMode: s.priceMode || (s.price ? 'fixed' : 'contact'),
      price: s.price ? String(s.price) : '',
      unit: s.unit || 'per visit',
      options: (Array.isArray(s.options) ? s.options : []).join('\n'),
      tasks: (Array.isArray(s.tasks) ? s.tasks : []).join('\n'),
      enabled: s.enabled !== false,
      comingSoon: Boolean(s.comingSoon),
      err: ''
    });
    setModalTab('service');
    setIsEditMode(true);
    setConfirmSvcDel(null);
    setConfirmCatDel(null);
    setModalOpen(true);
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

  // POST /api/v1/admin/service/create or PATCH /api/v1/admin/service/:id/update
  const handleSvcSubmit = async (e) => {
    e.preventDefault();
    if (!svcForm.name.trim()) {
      setSvcForm((prev) => ({ ...prev, err: 'Please enter a service name.' }));
      return;
    }
    if (!svcForm.categoryId) {
      setSvcForm((prev) => ({ ...prev, err: 'Please choose a category.' }));
      return;
    }
    if (!svcForm.city || !svcForm.city.trim()) {
      setSvcForm((prev) => ({ ...prev, err: 'Please select a city. City is mandatory.' }));
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

    const isEdit = Boolean(svcForm.id);
    const selectedCat = categories.find((c) => c.id === svcForm.categoryId) || {};
    const cleanCity = svcForm.city.trim();
    const resolvedCityName = cityName(cleanCity) || cleanCity;

    const servicePayload = {
      name: svcForm.name.trim(),
      category: svcForm.categoryId,
      categoryName: selectedCat.name || svcForm.categoryId,
      categoryIcon: selectedCat.icon || 'cross',
      categoryDesc: selectedCat.desc || '',
      categoryOrder: selectedCat.order || 0,
      city: cleanCity,
      cityName: resolvedCityName,
      type: selectedCat.kind || 'care',
      desc: svcForm.desc ? svcForm.desc.trim() : '',
      icon: svcForm.icon || 'cross',
      image: svcForm.image || null,
      priceMode: svcForm.priceMode,
      price: svcForm.priceMode === 'fixed' ? price : 0,
      unit: svcForm.unit || 'per visit',
      options: lines(svcForm.options),
      tasks: lines(svcForm.tasks),
      enabled: !!svcForm.enabled,
      comingSoon: Boolean(svcForm.comingSoon),
    };

    setIsSubmitting(true);
    try {
      if (isEdit) {
        // PATCH /api/v1/admin/service/:id/update
        const targetId = svcForm.backendId || svcForm.id;
        const res = await updateService(targetId, servicePayload);
        if (res?.error) {
          throw new Error(res.error.message || res.error || 'Failed to update service');
        }

        patch('services', svcForm.id, {
          ...servicePayload,
          price: servicePayload.price,
          updatedAt: Date.now(),
        });
        onShowToast?.(`Saved ${svcForm.name.trim()}`);
      } else {
        // POST /api/v1/admin/service/create
        const createdRes = await createService(servicePayload);
        if (createdRes?.error) {
          throw new Error(createdRes.error.message || createdRes.error || 'Failed to create service');
        }
        const createdData =
          createdRes?.payload?.data ||
          createdRes?.payload ||
          createdRes?.data ||
          createdRes;

        const newId =
          createdData?.code ||
          createdData?.serviceId ||
          createdData?.id ||
          svcForm.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 30) +
            '-' +
            Date.now().toString(36).slice(-4);

        const order = svcInCat(svcForm.categoryId, true).length + 1;
        put('services', newId, {
          ...(createdData || {}),
          ...servicePayload,
          id: newId,
          code: createdData?.code || newId,
          backendId: createdData?.id,
          order,
          updatedAt: Date.now(),
        });
        onShowToast?.(`Added ${svcForm.name.trim()}`);
      }
      handleCloseModal();
    } catch (err) {
      const errMsg =
        err?.data?.message ||
        err?.message ||
        'Failed to save service. Please check details and try again.';
      setSvcForm((prev) => ({ ...prev, err: errMsg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE /api/v1/admin/service/:id/delete
  const handleSvcDelete = async (svcId, svcName) => {
    const targetService = allServices.find((s) => s.id === svcId);
    const apiId = targetService?.backendId || targetService?.code || svcId;

    setIsSubmitting(true);
    try {
      const res = await deleteService(apiId);
      if (res?.error) {
        throw new Error(res.error.message || res.error || 'Failed to delete service');
      }

      remove('services', svcId);
      handleCloseModal();
      onShowToast?.(`Service deleted`);
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.message ||
        `Could not delete ${svcName || 'service'}. If it has active bookings, please hide it instead.`;
      if (svcForm) {
        setSvcForm((prev) => ({ ...prev, err: msg }));
      } else {
        onShowToast?.(msg);
      }
      setConfirmSvcDel(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // PATCH /api/v1/admin/service/:id/status
  const handleToggleSvcStatus = async (s) => {
    const newEnabled = s.enabled === false;
    const apiId = s.backendId || s.code || s.id;
    try {
      patch('services', s.id, { enabled: newEnabled });
      await toggleServiceStatus(apiId, { enabled: newEnabled });
      onShowToast?.(`${s.name} is ${newEnabled ? 'now live' : 'hidden'}`);
    } catch (err) {
      onShowToast?.(`${s.name} is ${newEnabled ? 'now live' : 'hidden'}`);
    }
  };

  // PATCH /api/v1/admin/services/reorder
  const handleMoveSvc = async (cid, id, dir) => {
    const list = svcInCat(cid, true);
    const idx = list.findIndex((s) => s.id === id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return;

    const reorderedList = [...list];
    const [moved] = reorderedList.splice(idx, 1);
    reorderedList.splice(targetIdx, 0, moved);

    // Optimistic local update
    reorderedList.forEach((s, k) => {
      patch('services', s.id, { order: k + 1 });
    });

    try {
      const items = reorderedList.map((s, k) => ({
        id: s.backendId || s.id || s.code,
        order: k + 1,
      }));
      await reorderServices({ items });
    } catch (err) {
      console.warn('Backend reorder services warning:', err);
    }
  };

  // PATCH /api/v1/admin/services/categories/:category
  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      setCatForm((prev) => ({ ...prev, err: 'Please enter a category name.' }));
      return;
    }

    const cleanName = catForm.name.trim();
    const isEdit = Boolean(catForm.id);
    const categoryPayload = {
      name: cleanName,
      desc: catForm.desc.trim(),
      icon: catForm.icon,
      kind: catForm.kind,
      type: catForm.kind,
      enabled: !!catForm.enabled,
      comingSoon: !!catForm.comingSoon,
    };

    setIsSubmitting(true);
    try {
      if (isEdit) {
        // PATCH /api/v1/admin/services/categories/:category
        // Try catForm.id, and if backend had it stored by original name, fallback to origName
        let apiSucceeded = false;
        try {
          const res = await updateCategory(catForm.id, categoryPayload);
          if (!res?.error) {
            apiSucceeded = true;
          } else if (catForm.origName && catForm.origName !== catForm.id) {
            const fallbackRes = await updateCategory(catForm.origName, categoryPayload);
            if (!fallbackRes?.error) apiSucceeded = true;
          }
        } catch (apiErr) {
          if (catForm.origName && catForm.origName !== catForm.id) {
            try {
              const fallbackRes = await updateCategory(catForm.origName, categoryPayload);
              if (!fallbackRes?.error) apiSucceeded = true;
            } catch (_) {}
          }
        }

        patch('categories', catForm.id, {
          name: cleanName,
          desc: catForm.desc.trim(),
          icon: catForm.icon,
          kind: catForm.kind,
          enabled: !!catForm.enabled,
          comingSoon: !!catForm.comingSoon,
        });
        onShowToast?.(`Saved ${cleanName}`);
      } else {
        const generatedSlug =
          cleanName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 30);

        const order = categories.length + 1;
        const createPayload = {
          name: cleanName,
          categoryId: generatedSlug,
          desc: catForm.desc.trim(),
          icon: catForm.icon,
          kind: catForm.kind,
          type: catForm.kind,
          enabled: !!catForm.enabled,
          comingSoon: !!catForm.comingSoon,
          order,
        };

        let createdCat = null;
        if (createCategory) {
          const res = await createCategory(createPayload);
          if (res?.error) {
            throw new Error(res.error.message || res.error || 'Failed to create category');
          }
          createdCat = res?.payload?.data || res?.data;
        }

        const catId = createdCat?.categoryId || createdCat?.id || generatedSlug;

        put('categories', catId, {
          id: catId,
          categoryId: catId,
          name: cleanName,
          desc: catForm.desc.trim(),
          icon: catForm.icon,
          kind: catForm.kind,
          type: catForm.kind,
          enabled: !!catForm.enabled,
          comingSoon: !!catForm.comingSoon,
          order,
        });

        fetchServices?.();
        onShowToast?.(`Added category ${cleanName}`);
      }
      handleCloseModal();
    } catch (err) {
      const errMsg =
        err?.data?.message ||
        err?.message ||
        'Failed to save category. Please try again.';
      setCatForm((prev) => ({ ...prev, err: errMsg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE /api/v1/admin/services/categories/:category/delete
  const handleCatDelete = async (catId) => {
    setIsSubmitting(true);
    try {
      const res = await deleteCategory(catId);
      if (res?.error) {
        throw new Error(res.error.message || res.error || 'Failed to delete category');
      }

      remove('categories', catId);
      handleCloseModal();
      onShowToast?.('Category deleted');
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.message ||
        'Could not delete category. If any services in this category have active bookings, please hide it instead.';
      if (catForm) {
        setCatForm((prev) => ({ ...prev, err: msg }));
      } else {
        onShowToast?.(msg);
      }
      setConfirmCatDel(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // PATCH /api/v1/admin/services/categories/:category/status
  const handleToggleCatStatus = async (c) => {
    const newEnabled = c.enabled === false;
    try {
      patch('categories', c.id, { enabled: newEnabled });
      await toggleCategoryStatus(c.id, { enabled: newEnabled });
      onShowToast?.(`${c.name} is ${newEnabled ? 'now live' : 'hidden'}`);
    } catch (err) {
      onShowToast?.(`${c.name} is ${newEnabled ? 'now live' : 'hidden'}`);
    }
  };

  // PATCH /api/v1/admin/services/categories/:category (reorder)
  const handleMoveCat = async (id, dir) => {
    const idx = categories.findIndex((c) => c.id === id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= categories.length) return;

    const reorderedCats = [...categories];
    const [moved] = reorderedCats.splice(idx, 1);
    reorderedCats.splice(targetIdx, 0, moved);

    reorderedCats.forEach((c, k) => {
      const want = k + 1;
      patch('categories', c.id, { order: want });
      updateCategory(c.id, { order: want }).catch(() => {});
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-4 w-full max-w-[1400px] mx-auto space-y-3">
      {/* 1. Top Header Row: Title on Left, Count & Actions on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Services</h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={servicesLoading}
            title="Refresh services from database"
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RiRefreshLine className={`text-base ${servicesLoading ? 'animate-spin text-[#0A2342]' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {servicesSummary?.totalCategories || categories.length} categories · {servicesSummary?.liveServices ?? liveCount} of {servicesSummary?.totalServices || allServices.length} services live
          </span>
{/* 
          <button
            type="button"
            onClick={() => handleOpenAddModal('category')}
            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition cursor-pointer select-none leading-none whitespace-nowrap"
          >
            <Icon name="plus" size={15} strokeWidth={2.4} />
            <span>Add category</span>
          </button> */}

          <button
            type="button"
            onClick={() => handleOpenAddModal('service')}
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

      {/* Error alert if backend fetch failed */}
      {servicesError && (
        <div className="p-3.5 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold">Database Notice:</span>
            <span>{servicesError}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-2.5 py-1 rounded bg-amber-200/70 hover:bg-amber-200 text-amber-950 font-bold text-xs transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Unified Service & Category Editor Modal */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
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
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div
            className="relative w-full max-w-6xl bg-white rounded-lg shadow-2xl border border-slate-200/90 my-auto animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    isEditMode
                      ? 'bg-teal-50 border-teal-200 text-teal-800'
                      : 'bg-[#F2A01F]/15 border-[#F2A01F]/30 text-[#0A2342]'
                  }`}
                >
                  <Icon
                    name={isEditMode ? 'edit' : modalTab === 'service' ? 'plus' : 'grid'}
                    size={18}
                    strokeWidth={2.4}
                  />
                </div>
                <div>
                  <h2 id="service-modal-title" className="text-base font-extrabold text-[#0A2342] leading-tight">
                    {isEditMode
                      ? modalTab === 'service'
                        ? 'Edit Service'
                        : 'Edit Category'
                      : modalTab === 'service'
                      ? 'Add New Service'
                      : 'Add New Category'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {modalTab === 'service'
                      ? 'Configure care service details, pricing and booking options'
                      : 'Manage service departments and app visibility'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition text-base font-bold"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Segmented Type Switcher (only shown when creating new) */}
            
            {!isEditMode && (
              <div className="px-5 sm:px-6 pt-3.5 pb-1 bg-white shrink-0">
                <div className="grid grid-cols-2 p-1 rounded-lg bg-[#EEF5FC] border border-slate-200/80 gap-1">
                  <button
                    type="button"
                    onClick={() => setModalTab('service')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                      modalTab === 'service'
                        ? 'bg-white text-[#0A2342] shadow-2xs border border-slate-200/60 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <Icon name="cross" size={15} />
                    <span>Service</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('category')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                      modalTab === 'category'
                        ? 'bg-white text-[#0A2342] shadow-2xs border border-slate-200/60 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <Icon name="grid" size={15} />
                    <span>Category</span>
                  </button>
                </div>
              </div>
            )}

            {/*================================== Modal Body: Service Form =================================== */}

            {modalTab === 'service' && svcForm && (
              <form onSubmit={handleSvcSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Service name <span className="text-red-500 font-bold">*</span>
                      </label>
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
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Category <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        required
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

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        City <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        required
                        value={svcForm.city || ''}
                        onChange={(e) => setSvcForm({ ...svcForm, city: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342] cursor-pointer"
                      >
                        <option value="">Select operational city...</option>
                        {availableCities.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            {ct.name}
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
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A2342] focus:border-[#0A2342] min-h-[76px]"
                    />
                  </div>

                  {/* Image or Icon Section */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Image or icon
                    </label>
                    <div className="flex items-center gap-3.5 flex-wrap mb-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-[#EEF5FC] border border-slate-200 text-[#0A2342] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {(() => {
                          const svcImgUrl =
                            svcForm.image?.data ||
                            svcForm.image?.url ||
                            (typeof svcForm.image === 'string' ? svcForm.image : null) ||
                            (svcForm.image?.id ? fileGet(svcForm.image.id)?.data : null);

                          return svcImgUrl ? (
                            <img
                              src={svcImgUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Icon
                              name={P[svcForm.icon] ? svcForm.icon : 'cross'}
                              size={26}
                              strokeWidth={2}
                              className="text-[#0A2342]"
                            />
                          );
                        })()}
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
                    <div className="flex flex-wrap gap-2 pt-0.5 max-h-24 overflow-y-auto p-1 bg-slate-50/50 rounded-lg border border-slate-100">
                      {ICON_CHOICES.map((icName) => (
                        <button
                          key={icName}
                          type="button"
                          onClick={() => setSvcForm({ ...svcForm, icon: icName, image: null })}
                          aria-pressed={svcForm.icon === icName && !svcForm.image}
                          aria-label={icName}
                          title={icName}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition cursor-pointer shrink-0 ${
                            svcForm.icon === icName && !svcForm.image
                              ? 'border-2 border-[#0A2342] bg-[#E4ECF7] text-[#0A2342]'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon name={icName} size={18} strokeWidth={2} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pricing configuration */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700">Price</label>
                    <div className="grid grid-cols-2 max-w-[340px] p-1 rounded-lg bg-[#EEF5FC] gap-1">
                      <button
                        type="button"
                        onClick={() => setSvcForm({ ...svcForm, priceMode: 'fixed' })}
                        className={`h-8 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center ${
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
                        className={`h-8 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center ${
                          svcForm.priceMode !== 'fixed'
                            ? 'bg-white text-[#0A2342] shadow-2xs'
                            : 'bg-transparent text-slate-600 hover:text-slate-900 font-bold'
                        }`}
                      >
                        Contact for price
                      </button>
                    </div>

                    {svcForm.priceMode === 'fixed' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg pt-1">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Price (₹) <span className="text-red-500 font-bold">*</span>
                          </label>
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
                        rows={4}
                        value={svcForm.options}
                        onChange={(e) => setSvcForm({ ...svcForm, options: e.target.value })}
                        placeholder="Single visit&#10;12-hr shift&#10;24-hr live-in"
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342] min-h-[88px]"
                      />
                      <div className="text-[11px] text-slate-500 font-medium mt-1">
                        Shown as choices when the client books (shifts, sessions, etc.).
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Staff checklist (one per line)
                      </label>
                      <textarea
                        rows={4}
                        value={svcForm.tasks}
                        onChange={(e) => setSvcForm({ ...svcForm, tasks: e.target.value })}
                        placeholder="Personal hygiene&#10;Meals & hydration&#10;Assisted walk"
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#0A2342] min-h-[88px]"
                      />
                      <div className="text-[11px] text-slate-500 font-medium mt-1">
                        Care tasks the nurse or caregiver ticks off during the visit.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={svcForm.enabled}
                        onChange={(e) => setSvcForm({ ...svcForm, enabled: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 accent-[#1E6B42] text-[#1E6B42] cursor-pointer"
                      />
                      <span>Show this service in the client app</span>
                    </label>

                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={svcForm.comingSoon}
                        onChange={(e) => setSvcForm({ ...svcForm, comingSoon: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 accent-[#1E6B42] text-[#1E6B42] cursor-pointer"
                      />
                      <span>Mark as “Coming soon” (visible, but clients can't book yet)</span>
                    </label>
                  </div>

                  {svcForm.err && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      {svcForm.err}
                    </div>
                  )}
                </div>

                {/* Service Form Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-5 sm:px-6 border-t border-slate-100 bg-slate-50/70 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-10 px-5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] disabled:opacity-50 text-[#0A2342] font-bold text-sm transition cursor-pointer shadow-2xs"
                    >
                      {isSubmitting ? 'Saving…' : svcForm.id ? 'Save service' : 'Add service'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
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
                            disabled={isSubmitting}
                            onClick={() => handleSvcDelete(svcForm.id, svcForm.name)}
                            className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                          >
                            {isSubmitting ? 'Deleting…' : 'Delete'}
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



          {/*===================================== Modal Body: Category Form ============================== */}

            {modalTab === 'category' && catForm && (
              <form onSubmit={handleCatSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Category name <span className="text-red-500 font-bold">*</span>
                      </label>
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
                    <label className="block text-xs font-bold text-slate-700 mb-2">Icon</label>
                    <div className="flex flex-wrap gap-2 pt-0.5 max-h-36 overflow-y-auto p-1 bg-slate-50/50 rounded-lg border border-slate-100">
                      {ICON_CHOICES.map((icName) => (
                        <button
                          key={icName}
                          type="button"
                          onClick={() => setCatForm({ ...catForm, icon: icName })}
                          aria-pressed={catForm.icon === icName}
                          aria-label={icName}
                          title={icName}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer shrink-0 ${
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
                </div>

                {/* Category Form Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-5 sm:px-6 border-t border-slate-100 bg-slate-50/70 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-10 px-5 rounded-lg bg-[#F2A01F] hover:bg-[#e09115] disabled:opacity-50 text-[#0A2342] font-bold text-sm transition cursor-pointer shadow-2xs"
                    >
                      {isSubmitting ? 'Saving…' : catForm.id ? 'Save category' : 'Add category'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="h-10 px-5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {catForm.id && (
                    <div>
                      {confirmCatDel === catForm.id ? (
                        <div className="inline-flex items-center gap-2 p-1.5 px-3 rounded-lg bg-red-50 border border-red-200 text-xs">
                          <span className="text-red-700 font-bold">Delete category?</span>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleCatDelete(catForm.id)}
                            className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                          >
                            {isSubmitting ? 'Deleting…' : 'Delete'}
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
          </div>
        </div>,
        document.body
      )}

      {/* Catalog Display: Categories and their Services */}
      <div className="space-y-6">
        {servicesLoading && categories.length === 0 ? (
          <DatabaseLoader message="Loading services catalog from database..." />
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center text-slate-400 border border-slate-200/90 space-y-1">
            <p className="font-bold text-slate-700 text-sm">No services or categories yet</p>
            <p className="text-xs">
              Add your first category using the button above.
            </p>
          </div>
        ) : (
          categories.map((c, ci) => {
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
                    onClick={() => handleOpenAddModal('service', c.id)}
                    className="h-8 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer whitespace-nowrap select-none leading-none"
                  >
                    <Icon name="plus" size={14} strokeWidth={2.4} />
                    <span>Service</span>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={c.enabled !== false}
                    onClick={() => handleToggleCatStatus(c)}
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
                          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate flex items-center gap-2 flex-wrap">
                            <span className="truncate">{s.name}</span>

                            {/* Operational City Badge */}
                            {(s.city || s.cityName) && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF5FC] text-[#0A2342] border border-[#DCE8F6] whitespace-nowrap shrink-0"
                                title={`Operational City: ${cityName(s.city) || s.cityName || s.city}`}
                              >
                                <Icon name="pin" size={11} strokeWidth={2.4} />
                                <span>{cityName(s.city) || s.cityName || s.city}</span>
                              </span>
                            )}

                            {s.comingSoon && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FDF0D9] text-[#8A5000] whitespace-nowrap shrink-0">
                                Coming soon
                              </span>
                            )}
                            {s.enabled === false && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 whitespace-nowrap shrink-0">
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
                            onClick={() => handleToggleSvcStatus(s)}
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
        }))}
      </div>
    </div>
  );
}
