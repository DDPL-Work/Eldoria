const { Op } = require('sequelize');
const { Service, Category, Booking, sequelize } = require('../database/models');
const { successResponse, errorResponse } = require('../utills/responseHandler');
const { generateServiceCode } = require('../helpers/generateServiceID');

/**
 * Active booking statuses considered as "open" / "in progress"
 */
const ACTIVE_BOOKING_STATUSES = [
  'requested',
  'confirmed',
  'assigned',
  'on_the_way',
  'in_progress',
];

/**
 * Helper to build lookup condition by numeric id, unique service code, or slug serviceId
 */
const buildServiceLookupCondition = (identifier) => {
  const cleanId = String(identifier || '').trim();
  const isNumeric = !isNaN(Number(cleanId)) && cleanId !== '';

  return isNumeric
    ? {
        [Op.or]: [
          { id: Number(cleanId) },
          { code: cleanId },
          { serviceId: cleanId.toLowerCase() },
        ],
      }
    : {
        [Op.or]: [
          { code: cleanId },
          { serviceId: cleanId.toLowerCase() },
        ],
      };
};

/**
 * Helper to slugify service name for URL identifiers
 */
const slugify = (text = '') => {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
};

/**
 * Standardize newline-delimited strings or arrays into a clean string array
 */
const normalizeStringList = (input) => {
  if (Array.isArray(input)) {
    return input.map((x) => String(x || '').trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Format a Service model instance into a comprehensive response object
 * that satisfies both the Admin and Client frontends
 */
const formatService = (s) => {
  const priceNum = Number(s.price) || 0;
  const isFixed = s.priceMode === 'fixed';
  const unitStr = s.unit || 'per visit';

  const priceFormatted =
    isFixed && priceNum > 0
      ? `₹${priceNum.toLocaleString('en-IN')} ${unitStr}`
      : 'Contact for price';

  return {
    id: s.id,
    code: s.code,
    serviceId: s.serviceId || s.code,
    name: s.name,
    category: s.category,
    categoryId: s.category, // for store compatibility (StoreContext: svc.categoryId === cat.id)
    categoryName: s.categoryName || s.category,
    categoryIcon: s.categoryIcon || 'cross',
    categoryDesc: s.categoryDesc || '',
    categoryOrder: s.categoryOrder || 0,
    type: s.type || 'care',
    kind: s.type || 'care', // alias matching frontend KINDS constant ('care', 'equipment', 'doctor')
    desc: s.desc || '',
    icon: s.icon || 'cross',
    image: s.image || null,
    priceMode: s.priceMode || 'fixed',
    price: priceNum,
    priceFormatted,
    unit: unitStr,
    options: Array.isArray(s.options) ? s.options : [],
    tasks: Array.isArray(s.tasks) ? s.tasks : [],
    enabled: Boolean(s.enabled),
    comingSoon: Boolean(s.comingSoon),
    order: s.order || 0,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
};

/**
 * Aggregate flat services list into categories matching frontend catsAll() & svcInCat()
 * Merges registered categories from Category model with categories derived from services
 */
const groupServicesByCategory = (servicesList = [], dbCategories = []) => {
  const catMap = new Map();

  // 1. Populate registered categories first (ensures newly added categories with 0 services are visible)
  if (Array.isArray(dbCategories)) {
    dbCategories.forEach((c) => {
      const catData = c.toJSON ? c.toJSON() : c;
      const key = catData.categoryId || catData.category || slugify(catData.name);
      catMap.set(key, {
        id: key,
        categoryId: key,
        name: catData.name,
        desc: catData.desc || '',
        icon: catData.icon || 'cross',
        kind: catData.kind || catData.type || 'care',
        type: catData.type || catData.kind || 'care',
        order: catData.order || 0,
        enabled: catData.enabled !== false,
        comingSoon: Boolean(catData.comingSoon),
        servicesCount: 0,
        liveCount: 0,
        services: [],
      });
    });
  }

  // 2. Aggregate services into categories
  servicesList.forEach((s) => {
    const key = s.category || 'General';
    if (!catMap.has(key)) {
      catMap.set(key, {
        id: key,
        categoryId: key,
        name: s.categoryName || s.category,
        desc: s.categoryDesc || '',
        icon: s.categoryIcon || 'cross',
        kind: s.type || 'care',
        type: s.type || 'care',
        order: s.categoryOrder || 0,
        enabled: s.enabled !== false,
        comingSoon: Boolean(s.comingSoon),
        servicesCount: 0,
        liveCount: 0,
        services: [],
      });
    }

    const cat = catMap.get(key);
    cat.servicesCount += 1;
    if (s.enabled) {
      cat.liveCount += 1;
    }
    cat.services.push(s);
  });

  return Array.from(catMap.values()).sort(
    (a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)
  );
};

// =========================================================================
// ADMIN CONTROLLERS
// =========================================================================

/**
 * 1. GET /api/v1/admin/services
 * Retrieve all services with search, filtering, and grouped categories for the Admin Catalog
 */
const getAdminServices = async (req, res) => {
  try {
    const {
      category,
      type,
      status = 'all', // 'all' | 'live' | 'hidden'
      search,
      sortBy = 'order',
      sortOrder = 'ASC',
    } = req.query;

    const where = {};

    // Filter by live/hidden
    if (status === 'live') {
      where.enabled = true;
    } else if (status === 'hidden') {
      where.enabled = false;
    }

    // Filter by category
    if (category && category !== 'all') {
      where.category = category;
    }

    // Filter by type / kind
    if (type && type !== 'all') {
      where.type = type;
    }

    // Search by name, code, category, or description
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      where[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), { [Op.like]: q }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('code')), { [Op.like]: q }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('category')), { [Op.like]: q }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('desc')), { [Op.like]: q }),
      ];
    }

    const validSortFields = ['order', 'name', 'price', 'category', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'order';
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const rawServices = await Service.findAll({
      where,
      order: [
        ['categoryOrder', 'ASC'],
        [sortField, sortDirection],
        ['id', 'ASC'],
      ],
    });

    // Also fetch all explicitly created categories from Category table
    const allDbCategories = await Category.findAll({
      order: [
        ['order', 'ASC'],
        ['name', 'ASC'],
      ],
    }).catch(() => []);

    const formattedServices = rawServices.map(formatService);
    const categoriesGrouped = groupServicesByCategory(formattedServices, allDbCategories);

    // Catalog summary counters
    const totalServices = await Service.count();
    const liveServices = await Service.count({ where: { enabled: true } });
    const hiddenServices = totalServices - liveServices;

    return successResponse(
      res,
      {
        services: formattedServices,
        categories: categoriesGrouped,
        summary: {
          totalServices,
          liveServices,
          hiddenServices,
          totalCategories: categoriesGrouped.length,
        },
      },
      'Services catalog retrieved successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch services', 500, error);
  }
};

/**
 * 2. GET /api/v1/admin/services/:id
 * Retrieve a single service by numeric ID, unique code, or slug
 */
const getAdminServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'Service identifier is required', 400);
    }

    const service = await Service.findOne({
      where: buildServiceLookupCondition(id),
    });

    if (!service) {
      return errorResponse(res, `Service '${id}' not found`, 404);
    }

    // Fetch booking statistics for this service
    const serviceBookings = await Booking.findAll({
      where: {
        [Op.or]: [
          { service: service.code },
          { service: service.serviceId || '' },
          { serviceName: service.name },
        ],
      },
      attributes: ['id', 'status', 'price', 'date'],
    });

    const activeBookingsCount = serviceBookings.filter((b) =>
      ACTIVE_BOOKING_STATUSES.includes(b.status)
    ).length;

    const payload = {
      ...formatService(service),
      stats: {
        totalBookings: serviceBookings.length,
        activeBookings: activeBookingsCount,
      },
    };

    return successResponse(res, payload, 'Service details retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch service details', 500, error);
  }
};

/**
 * 3. POST /api/v1/admin/services
 * Create a new service offering.
 * Generates formatted service code: ELD{catInitial}{addedDate}{typeInitial}{serial}
 */
const createService = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      category,
      categoryName,
      categoryIcon,
      categoryDesc,
      categoryOrder,
      type = 'care',
      desc,
      icon = 'cross',
      image,
      priceMode = 'fixed',
      price = 0,
      unit = 'per visit',
      options = [],
      tasks = [],
      enabled = true,
      comingSoon = false,
      order,
    } = req.body;

    // Validation: Name is required
    if (!name || !name.trim()) {
      await transaction.rollback();
      return errorResponse(res, 'Service name is required', 400);
    }

    // Validation: Category is required
    if (!category || !category.trim()) {
      await transaction.rollback();
      return errorResponse(res, 'Category is required', 400);
    }

    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanPriceMode = priceMode === 'contact' ? 'contact' : 'fixed';
    const cleanPrice = cleanPriceMode === 'fixed' ? Math.max(0, parseFloat(price) || 0) : 0;

    // If fixed price mode, require valid price
    if (cleanPriceMode === 'fixed' && cleanPrice <= 0) {
      await transaction.rollback();
      return errorResponse(res, 'Please enter a valid price or choose "Contact for price"', 400);
    }

    // Check for duplicate service name within the same category
    const existing = await Service.findOne({
      where: {
        category: cleanCategory,
        name: cleanName,
      },
      transaction,
    });

    if (existing) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Service '${cleanName}' already exists under '${cleanCategory}'`,
        409
      );
    }

    // Generate service code via helper
    const code = await generateServiceCode(
      cleanCategory,
      type,
      new Date(),
      transaction
    );

    // Compute order within category if not provided
    let serviceOrder = order;
    if (serviceOrder === undefined || serviceOrder === null || isNaN(parseInt(serviceOrder, 10))) {
      const countInCat = await Service.count({
        where: { category: cleanCategory },
        transaction,
      });
      serviceOrder = countInCat + 1;
    } else {
      serviceOrder = parseInt(serviceOrder, 10);
    }

    // Slug identifier e.g. 'senior-citizen-care-9a2f'
    const slugBase = slugify(cleanName);
    const serviceSlug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

    const newService = await Service.create(
      {
        code,
        serviceId: serviceSlug,
        name: cleanName,
        category: cleanCategory,
        categoryName: categoryName?.trim() || cleanCategory,
        categoryIcon: categoryIcon?.trim() || 'cross',
        categoryDesc: categoryDesc?.trim() || null,
        categoryOrder: parseInt(categoryOrder, 10) || 0,
        type: ['care', 'equipment', 'doctor', 'other'].includes(type) ? type : 'care',
        desc: desc ? desc.trim() : null,
        icon: icon ? icon.trim() : 'cross',
        image: image || null,
        priceMode: cleanPriceMode,
        price: cleanPrice,
        unit: unit ? unit.trim() : 'per visit',
        options: normalizeStringList(options),
        tasks: normalizeStringList(tasks),
        enabled: enabled !== false,
        comingSoon: Boolean(comingSoon),
        order: serviceOrder,
      },
      { transaction }
    );

    await transaction.commit();

    return successResponse(
      res,
      formatService(newService),
      `Service '${newService.name}' added successfully (${newService.code})`,
      201
    );
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message || 'Failed to create service', 500, error);
  }
};

/**
 * 4. PUT / PATCH /api/v1/admin/services/:id
 * Edit service details
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return errorResponse(res, 'Service identifier is required', 400);
    }

    const service = await Service.findOne({
      where: buildServiceLookupCondition(id),
    });

    if (!service) {
      return errorResponse(res, `Service '${id}' not found`, 404);
    }

    // Name update & validation
    if (updates.name !== undefined) {
      if (!updates.name || !updates.name.trim()) {
        return errorResponse(res, 'Service name cannot be empty', 400);
      }
      service.name = updates.name.trim();
    }

    // Category update
    if (updates.category !== undefined && updates.category.trim()) {
      service.category = updates.category.trim();
    }
    if (updates.categoryName !== undefined) {
      service.categoryName = updates.categoryName ? updates.categoryName.trim() : service.category;
    }
    if (updates.categoryIcon !== undefined) {
      service.categoryIcon = updates.categoryIcon.trim();
    }
    if (updates.categoryDesc !== undefined) {
      service.categoryDesc = updates.categoryDesc ? updates.categoryDesc.trim() : null;
    }
    if (updates.categoryOrder !== undefined) {
      service.categoryOrder = parseInt(updates.categoryOrder, 10) || 0;
    }

    // Type / Kind
    if (updates.type !== undefined) {
      service.type = ['care', 'equipment', 'doctor', 'other'].includes(updates.type)
        ? updates.type
        : service.type;
    }

    // Description & Icon
    if (updates.desc !== undefined) service.desc = updates.desc ? updates.desc.trim() : null;
    if (updates.icon !== undefined) service.icon = updates.icon.trim() || 'cross';
    if (updates.image !== undefined) service.image = updates.image || null;

    // Price mode & pricing
    if (updates.priceMode !== undefined) {
      service.priceMode = updates.priceMode === 'contact' ? 'contact' : 'fixed';
    }
    if (updates.price !== undefined) {
      const p = parseFloat(updates.price);
      service.price = !isNaN(p) && p >= 0 ? p : 0;
    }
    if (service.priceMode === 'fixed' && Number(service.price) <= 0) {
      return errorResponse(res, 'Please enter a valid price or choose "Contact for price"', 400);
    }
    if (updates.unit !== undefined) service.unit = updates.unit.trim() || 'per visit';

    // Options & Tasks
    if (updates.options !== undefined) service.options = normalizeStringList(updates.options);
    if (updates.tasks !== undefined) service.tasks = normalizeStringList(updates.tasks);

    // Enabled & Coming soon
    if (updates.enabled !== undefined) service.enabled = Boolean(updates.enabled);
    if (updates.comingSoon !== undefined) service.comingSoon = Boolean(updates.comingSoon);

    // Order
    if (updates.order !== undefined) {
      const parsedOrder = parseInt(updates.order, 10);
      if (!isNaN(parsedOrder)) service.order = parsedOrder;
    }

    await service.save();

    return successResponse(
      res,
      formatService(service),
      `Service '${service.name}' updated successfully`
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to update service', 500, error);
  }
};

/**
 * 5. PATCH /api/v1/admin/services/:id/status
 * Toggle service live / hidden status (matches `Services.jsx` toggle switch)
 */
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, status } = req.body;

    if (!id) {
      return errorResponse(res, 'Service identifier is required', 400);
    }

    const service = await Service.findOne({
      where: buildServiceLookupCondition(id),
    });

    if (!service) {
      return errorResponse(res, `Service '${id}' not found`, 404);
    }

    let targetStatus;
    if (enabled !== undefined) {
      targetStatus = Boolean(enabled);
    } else if (status !== undefined) {
      targetStatus = status === 'live' || status === 'enabled';
    } else {
      targetStatus = !service.enabled;
    }

    service.enabled = targetStatus;
    await service.save();

    const label = targetStatus ? 'now live' : 'hidden';
    return successResponse(
      res,
      formatService(service),
      `${service.name} is ${label}`
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to toggle service status', 500, error);
  }
};

/**
 * 6. PATCH /api/v1/admin/services/reorder
 * Reorder multiple services or single service within a category
 */
const reorderServices = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, id, order } = req.body;

    // Bulk reordering: [{ id: 1, order: 1 }, { id: 2, order: 2 }]
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.id && item.order !== undefined) {
          await Service.update(
            { order: parseInt(item.order, 10) },
            { where: buildServiceLookupCondition(item.id), transaction }
          );
        }
      }
      await transaction.commit();
      return successResponse(res, null, 'Services reordered successfully');
    }

    // Single service reorder: id + order
    const targetId = id || req.params.id;
    if (targetId && order !== undefined) {
      const service = await Service.findOne({
        where: buildServiceLookupCondition(targetId),
        transaction,
      });

      if (!service) {
        await transaction.rollback();
        return errorResponse(res, `Service '${targetId}' not found`, 404);
      }

      service.order = parseInt(order, 10);
      await service.save({ transaction });
      await transaction.commit();

      return successResponse(
        res,
        formatService(service),
        `Service '${service.name}' order updated to ${service.order}`
      );
    }

    await transaction.rollback();
    return errorResponse(res, 'Please provide an array of items or an id and order', 400);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, error.message || 'Failed to reorder services', 500, error);
  }
};

/**
 * 7. DELETE /api/v1/admin/services/:id
 * Delete a service with booking safety guard
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'Service identifier is required', 400);
    }

    const service = await Service.findOne({
      where: buildServiceLookupCondition(id),
    });

    if (!service) {
      return errorResponse(res, `Service '${id}' not found`, 404);
    }

    // SAFETY GUARD: Check for active bookings linked to this service
    const activeBookingsCount = await Booking.count({
      where: {
        [Op.or]: [
          { service: service.code },
          { service: service.serviceId || '' },
          { serviceName: service.name },
        ],
        status: { [Op.in]: ACTIVE_BOOKING_STATUSES },
      },
    });

    if (activeBookingsCount > 0) {
      return errorResponse(
        res,
        `Cannot delete '${service.name}' because it currently has ${activeBookingsCount} active booking(s). Please hide the service instead to preserve patient care records.`,
        400
      );
    }

    const serviceName = service.name;
    const serviceCode = service.code;
    await service.destroy();

    return successResponse(
      res,
      { id, code: serviceCode, name: serviceName },
      `Service '${serviceName}' deleted successfully`
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to delete service', 500, error);
  }
};

// =========================================================================
// CATEGORY OPERATIONS (Dedicated & Embedded Categories)
// =========================================================================

/**
 * 8. POST /api/v1/admin/services/categories
 * POST /api/v1/admin/category/create
 * Create a new service category
 */
const createCategory = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      category,
      categoryId,
      desc,
      icon = 'cross',
      kind = 'care',
      type = 'care',
      order,
      enabled = true,
      comingSoon = false,
    } = req.body;

    // Validation: Category name is required
    if (!name || !name.trim()) {
      await transaction.rollback();
      return errorResponse(res, 'Category name is required', 400);
    }

    const cleanName = name.trim();
    const rawSlug = (categoryId || category || '').trim();
    const cleanSlug = rawSlug ? slugify(rawSlug) : slugify(cleanName);

    if (!cleanSlug) {
      await transaction.rollback();
      return errorResponse(res, 'Could not generate a valid category identifier', 400);
    }

    const cleanKind = ['care', 'equipment', 'doctor', 'other'].includes(kind || type)
      ? (kind || type)
      : 'care';

    // Check if category already exists in Category table
    const existingInCatTable = await Category.findOne({
      where: {
        [Op.or]: [
          { categoryId: cleanSlug },
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), cleanName.toLowerCase()),
        ],
      },
      transaction,
    });

    if (existingInCatTable) {
      await transaction.rollback();
      return errorResponse(
        res,
        `Category '${cleanName}' already exists (id: '${existingInCatTable.categoryId}')`,
        409
      );
    }

    // Also check if any existing Service uses this category slug or name
    const existingInService = await Service.findOne({
      where: {
        [Op.or]: [
          { category: cleanSlug },
          sequelize.where(sequelize.fn('LOWER', sequelize.col('categoryName')), cleanName.toLowerCase()),
        ],
      },
      transaction,
    });

    if (existingInService) {
      await transaction.rollback();
      return errorResponse(
        res,
        `A category '${cleanName}' already exists in service catalog (${cleanSlug})`,
        409
      );
    }

    // Determine order if not explicitly specified
    let catOrder = order;
    if (catOrder === undefined || catOrder === null || isNaN(parseInt(catOrder, 10))) {
      const maxCatOrder = await Category.max('order', { transaction }).catch(() => 0);
      const maxSvcOrder = await Service.max('categoryOrder', { transaction }).catch(() => 0);
      const currentMax = Math.max(Number(maxCatOrder) || 0, Number(maxSvcOrder) || 0);
      catOrder = currentMax + 1;
    } else {
      catOrder = parseInt(catOrder, 10);
    }

    const newCategory = await Category.create(
      {
        categoryId: cleanSlug,
        name: cleanName,
        desc: desc ? desc.trim() : null,
        icon: icon ? icon.trim() : 'cross',
        kind: cleanKind,
        type: cleanKind,
        order: catOrder,
        enabled: enabled !== false,
        comingSoon: Boolean(comingSoon),
      },
      { transaction }
    );

    await transaction.commit();

    const responsePayload = {
      id: newCategory.categoryId,
      categoryId: newCategory.categoryId,
      name: newCategory.name,
      desc: newCategory.desc || '',
      icon: newCategory.icon || 'cross',
      kind: newCategory.kind || 'care',
      type: newCategory.type || 'care',
      order: newCategory.order || 0,
      enabled: Boolean(newCategory.enabled),
      comingSoon: Boolean(newCategory.comingSoon),
      servicesCount: 0,
      liveCount: 0,
      services: [],
      createdAt: newCategory.createdAt,
      updatedAt: newCategory.updatedAt,
    };

    return successResponse(
      res,
      responsePayload,
      `Category '${newCategory.name}' created successfully`,
      201
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || 'Failed to create category', 500, error);
  }
};

/**
 * 9. PATCH /api/v1/admin/services/categories/:category
 * Update metadata (name, icon, description, type, order) across Category model and services
 */
const updateCategory = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { category } = req.params;
    const {
      name,
      newCategory,
      desc,
      icon,
      kind,
      type,
      order,
      enabled,
      comingSoon,
    } = req.body;

    if (!category) {
      await transaction.rollback();
      return errorResponse(res, 'Category parameter is required', 400);
    }

    const targetCategory = category.trim();

    // Check presence in Category model or Service model
    const [catRecord, countInServices] = await Promise.all([
      Category.findOne({
        where: {
          [Op.or]: [
            { categoryId: targetCategory },
            sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), targetCategory.toLowerCase()),
          ],
        },
        transaction,
      }).catch(() => null),
      Service.count({
        where: { category: targetCategory },
        transaction,
      }),
    ]);

    if (!catRecord && countInServices === 0) {
      await transaction.rollback();
      return errorResponse(res, `Category '${targetCategory}' not found`, 404);
    }

    const finalCatKey = (newCategory || (name ? slugify(name) : '') || targetCategory).trim();
    const cleanKind = kind || type;

    // 1. Update Category table
    if (catRecord) {
      const catUpdates = {};
      if (name !== undefined) catUpdates.name = name.trim();
      if (newCategory !== undefined) catUpdates.categoryId = finalCatKey;
      if (desc !== undefined) catUpdates.desc = desc ? desc.trim() : null;
      if (icon !== undefined) catUpdates.icon = icon.trim() || 'cross';
      if (cleanKind && ['care', 'equipment', 'doctor', 'other'].includes(cleanKind)) {
        catUpdates.kind = cleanKind;
        catUpdates.type = cleanKind;
      }
      if (order !== undefined) catUpdates.order = parseInt(order, 10) || 0;
      if (enabled !== undefined) catUpdates.enabled = Boolean(enabled);
      if (comingSoon !== undefined) catUpdates.comingSoon = Boolean(comingSoon);

      await catRecord.update(catUpdates, { transaction });
    }

    // 2. Update all services under this category
    if (countInServices > 0) {
      const serviceUpdates = {};
      if (finalCatKey) {
        serviceUpdates.category = finalCatKey;
        serviceUpdates.categoryName = name ? name.trim() : finalCatKey;
      }
      if (desc !== undefined) serviceUpdates.categoryDesc = desc ? desc.trim() : null;
      if (icon !== undefined) serviceUpdates.categoryIcon = icon.trim() || 'cross';
      if (cleanKind && ['care', 'equipment', 'doctor', 'other'].includes(cleanKind)) {
        serviceUpdates.type = cleanKind;
      }
      if (order !== undefined) serviceUpdates.categoryOrder = parseInt(order, 10) || 0;
      if (enabled !== undefined) serviceUpdates.enabled = Boolean(enabled);
      if (comingSoon !== undefined) serviceUpdates.comingSoon = Boolean(comingSoon);

      await Service.update(serviceUpdates, {
        where: { category: targetCategory },
        transaction,
      });
    }

    await transaction.commit();

    return successResponse(
      res,
      { category: finalCatKey || targetCategory, updatedServicesCount: countInServices },
      `Category '${finalCatKey || targetCategory}' updated successfully`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || 'Failed to update category', 500, error);
  }
};

/**
 * 10. PATCH /api/v1/admin/services/categories/:category/status
 * Toggle enabled / comingSoon status for a category and its services
 */
const toggleCategoryStatus = async (req, res) => {
  try {
    const { category } = req.params;
    const { enabled, comingSoon } = req.body;

    if (!category) {
      return errorResponse(res, 'Category parameter is required', 400);
    }

    const targetCategory = category.trim();

    const [catRecord, servicesInCat] = await Promise.all([
      Category.findOne({
        where: {
          [Op.or]: [
            { categoryId: targetCategory },
            sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), targetCategory.toLowerCase()),
          ],
        },
      }).catch(() => null),
      Service.findAll({
        where: { category: targetCategory },
      }),
    ]);

    if (!catRecord && servicesInCat.length === 0) {
      return errorResponse(res, `Category '${targetCategory}' not found`, 404);
    }

    let targetStatus;
    if (enabled !== undefined) {
      targetStatus = Boolean(enabled);
    } else if (catRecord) {
      targetStatus = !catRecord.enabled;
    } else {
      const currentLive = servicesInCat.some((s) => s.enabled);
      targetStatus = !currentLive;
    }

    const updates = { enabled: targetStatus };
    if (comingSoon !== undefined) {
      updates.comingSoon = Boolean(comingSoon);
    }

    if (catRecord) {
      await catRecord.update(updates);
    }
    if (servicesInCat.length > 0) {
      await Service.update(updates, {
        where: { category: targetCategory },
      });
    }

    const statusLabel = targetStatus ? 'now live' : 'hidden';
    return successResponse(
      res,
      { category: targetCategory, enabled: targetStatus },
      `Category '${targetCategory}' is ${statusLabel}`
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to toggle category status', 500, error);
  }
};

/**
 * 11. DELETE /api/v1/admin/services/categories/:category
 * Delete category and its services with safety check for active bookings
 */
const deleteCategory = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { category } = req.params;

    if (!category) {
      await transaction.rollback();
      return errorResponse(res, 'Category parameter is required', 400);
    }

    const targetCategory = category.trim();

    const [catRecord, servicesInCat] = await Promise.all([
      Category.findOne({
        where: {
          [Op.or]: [
            { categoryId: targetCategory },
            sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), targetCategory.toLowerCase()),
          ],
        },
        transaction,
      }).catch(() => null),
      Service.findAll({
        where: { category: targetCategory },
        transaction,
      }),
    ]);

    if (!catRecord && servicesInCat.length === 0) {
      await transaction.rollback();
      return errorResponse(res, `Category '${targetCategory}' not found`, 404);
    }

    // Safety check: active bookings in services of this category
    if (servicesInCat.length > 0) {
      const codes = servicesInCat.map((s) => s.code);
      const names = servicesInCat.map((s) => s.name);

      const activeBookingsCount = await Booking.count({
        where: {
          [Op.or]: [
            { service: { [Op.in]: codes } },
            { serviceName: { [Op.in]: names } },
          ],
          status: { [Op.in]: ACTIVE_BOOKING_STATUSES },
        },
        transaction,
      });

      if (activeBookingsCount > 0) {
        await transaction.rollback();
        return errorResponse(
          res,
          `Cannot delete category '${targetCategory}' because it contains services with ${activeBookingsCount} active booking(s). Please hide the category instead.`,
          400
        );
      }

      await Service.destroy({
        where: { category: targetCategory },
        transaction,
      });
    }

    if (catRecord) {
      await catRecord.destroy({ transaction });
    }

    await transaction.commit();

    return successResponse(
      res,
      { category: targetCategory, deletedServicesCount: servicesInCat.length },
      `Category '${targetCategory}' and its ${servicesInCat.length} service(s) deleted successfully`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || 'Failed to delete category', 500, error);
  }
};

// =========================================================================
// PUBLIC & CLIENT CONTROLLERS
// =========================================================================

/**
 * 11. GET /api/v1/services (Public / Client catalog)
 * Returns live operational services.
 * Supports:
 * - category: filter by category
 * - type: filter by type ('care', 'equipment', 'doctor')
 * - search: search term
 * - bookable: if true, only services where comingSoon is false
 * - grouped: if true, returns catalog grouped by category (for client UI)
 */
const getPublicServices = async (req, res) => {
  try {
    const {
      category,
      type,
      search,
      bookable = 'false',
      grouped = 'false',
    } = req.query;

    const where = {
      enabled: true, // Only live services
    };

    if (bookable === 'true') {
      where.comingSoon = false; // Only bookable services
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      where[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), { [Op.like]: q }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('desc')), { [Op.like]: q }),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('category')), { [Op.like]: q }),
      ];
    }

    const services = await Service.findAll({
      where,
      order: [
        ['categoryOrder', 'ASC'],
        ['order', 'ASC'],
        ['name', 'ASC'],
      ],
    });

    const formatted = services.map(formatService);

    if (grouped === 'true') {
      const groupedCats = groupServicesByCategory(formatted);
      return successResponse(res, groupedCats, 'Operational services catalog retrieved');
    }

    return successResponse(res, formatted, 'Operational services retrieved');
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch services', 500, error);
  }
};

/**
 * 12. GET /api/v1/services/categories
 * Public list of service categories for client browsing
 */
const getPublicCategories = async (req, res) => {
  try {
    const liveServices = await Service.findAll({
      where: { enabled: true },
      order: [
        ['categoryOrder', 'ASC'],
        ['order', 'ASC'],
      ],
    });

    const liveDbCategories = await Category.findAll({
      where: { enabled: true },
      order: [
        ['order', 'ASC'],
        ['name', 'ASC'],
      ],
    }).catch(() => []);

    const grouped = groupServicesByCategory(liveServices.map(formatService), liveDbCategories);

    // Map to clean category summary objects
    const categories = grouped.map((c) => ({
      id: c.id,
      categoryId: c.categoryId || c.id,
      name: c.name,
      desc: c.desc,
      icon: c.icon,
      kind: c.kind,
      type: c.type,
      order: c.order,
      comingSoon: c.comingSoon,
      servicesCount: c.servicesCount,
    }));

    return successResponse(res, categories, 'Service categories retrieved');
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch service categories', 500, error);
  }
};

/**
 * 13. GET /api/v1/services/:id
 * Retrieve single service details for client booking
 */
const getPublicServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 'Service identifier is required', 400);
    }

    const service = await Service.findOne({
      where: {
        ...buildServiceLookupCondition(id),
        enabled: true,
      },
    });

    if (!service) {
      return errorResponse(res, `Service '${id}' not found or is currently unavailable`, 404);
    }

    return successResponse(res, formatService(service), 'Service details retrieved');
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch service details', 500, error);
  }
};

module.exports = {
  // Admin Controllers
  getAdminServices,
  getAdminServiceById,
  createService,
  updateService,
  toggleServiceStatus,
  reorderServices,
  deleteService,
  updateCategory,
  createCategory,
  toggleCategoryStatus,
  deleteCategory,

  // Public / Client Controllers
  getPublicServices,
  getPublicCategories,
  getPublicServiceById,
};
