const { Op } = require("sequelize");
const {
  NotifyMe,
  InAppNotification,
  Category,
  Service,
  User,
  City,
  sequelize,
} = require("../database/models");
const { successResponse, errorResponse } = require("../utills/responseHandler");

/**
 * Standardize phone number to 10 digits
 */
const cleanPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = String(phone).replace(/[^\d]/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
};

// =========================================================================
// CLIENT-FACING CONTROLLERS
// =========================================================================

/**
 * 1. Client Subscribes to "Notify Me" for a Coming Soon Category or Service
 * POST /api/v1/client/notify-me
 * POST /api/v1/client/coming-soon/notify-me
 */
const subscribeNotifyMe = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const body = req.body || {};
    const {
      targetType: rawTargetType,
      targetId: rawTargetId,
      targetName: customTargetName,
      phone: rawPhone,
      name: rawName,
      email,
      city: rawCity,
      area,
      source = "App",
      channel = "in_app",
      metadata = {},
    } = body;

    const targetType = (rawTargetType || "category").toLowerCase().trim();
    const targetId = (rawTargetId || "").toString().trim();

    if (!targetId) {
      await transaction.rollback();
      return errorResponse(res, "targetId (category slug or service identifier) is required.", 400);
    }

    if (!["category", "service"].includes(targetType)) {
      await transaction.rollback();
      return errorResponse(res, "targetType must be either 'category' or 'service'.", 400);
    }

    // Resolve user details from authenticated token if available
    const resolvedUserId = req.user?.id || null;
    const clientPhone = cleanPhoneNumber(rawPhone || req.user?.phone);
    const clientName = (rawName || req.user?.name || "").trim() || null;
    const clientEmail = (email || req.user?.email || "").trim() || null;
    const clientCity = (rawCity || req.user?.city || req.headers["x-client-city"] || "mumbai")
      .toLowerCase()
      .trim();

    if (!clientPhone || clientPhone.length !== 10) {
      await transaction.rollback();
      return errorResponse(
        res,
        "A valid 10-digit mobile number is required to receive launch notifications.",
        400
      );
    }

    // Look up target category or service in database to verify existence and name
    let resolvedTargetName = customTargetName ? customTargetName.trim() : "";
    let isComingSoon = false;
    let isLive = true;

    if (targetType === "category") {
      const categoryRecord = await Category.findOne({
        where: {
          [Op.or]: [
            { categoryId: targetId },
            sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), targetId.toLowerCase()),
          ],
        },
        transaction,
      });

      if (categoryRecord) {
        resolvedTargetName = categoryRecord.name || resolvedTargetName || targetId;
        isComingSoon = Boolean(categoryRecord.comingSoon);
        isLive = Boolean(categoryRecord.enabled);
      } else {
        // Fallback default for doctor services if category hasn't been seeded yet
        if (targetId.toLowerCase().includes("doc")) {
          resolvedTargetName = "Doctor Services";
          isComingSoon = true;
        } else {
          resolvedTargetName = resolvedTargetName || targetId;
          isComingSoon = true;
        }
      }
    } else {
      // Service level lookup
      const isNumeric = !isNaN(Number(targetId)) && /^\d+$/.test(targetId);
      const serviceWhere = isNumeric
        ? { [Op.or]: [{ id: Number(targetId) }, { code: targetId }, { serviceId: targetId }] }
        : { [Op.or]: [{ code: targetId }, { serviceId: targetId }, { name: targetId }] };

      const serviceRecord = await Service.findOne({
        where: serviceWhere,
        transaction,
      });

      if (serviceRecord) {
        resolvedTargetName = serviceRecord.name || resolvedTargetName || targetId;
        isComingSoon = Boolean(serviceRecord.comingSoon);
        isLive = Boolean(serviceRecord.enabled);
      } else {
        resolvedTargetName = resolvedTargetName || targetId;
        isComingSoon = true;
      }
    }

    // If target is already active and NOT coming soon, inform client
    if (isLive && !isComingSoon) {
      await transaction.rollback();
      return successResponse(
        res,
        {
          isLive: true,
          isComingSoon: false,
          targetType,
          targetId,
          targetName: resolvedTargetName,
        },
        `${resolvedTargetName} is already live and available for booking!`,
        200
      );
    }

    // Check if user has already subscribed with this phone number
    const existingSubscription = await NotifyMe.findOne({
      where: {
        phone: clientPhone,
        targetType,
        targetId,
      },
      transaction,
    });

    let subscriptionRecord;
    let message;

    if (existingSubscription) {
      if (existingSubscription.status === "pending") {
        await transaction.commit();
        return successResponse(
          res,
          {
            subscription: existingSubscription,
            isSubscribed: true,
            alreadySubscribed: true,
            targetName: resolvedTargetName,
          },
          `You're already on the priority list! We'll notify you in-app as soon as ${resolvedTargetName} launches in ${clientCity}.`
        );
      } else {
        // Re-activate previously notified or cancelled request
        await existingSubscription.update(
          {
            status: "pending",
            notifiedAt: null,
            userId: resolvedUserId || existingSubscription.userId,
            name: clientName || existingSubscription.name,
            email: clientEmail || existingSubscription.email,
            city: clientCity || existingSubscription.city,
            area: area || existingSubscription.area,
            source,
            channel,
            metadata: { ...(existingSubscription.metadata || {}), ...metadata },
          },
          { transaction }
        );
        subscriptionRecord = existingSubscription;
        message = `Priority notification reactivated! We'll notify you via in-app notification when ${resolvedTargetName} launches.`;
      }
    } else {
      subscriptionRecord = await NotifyMe.create(
        {
          userId: resolvedUserId,
          phone: clientPhone,
          name: clientName,
          email: clientEmail,
          city: clientCity,
          area: area || null,
          targetType,
          targetId,
          targetName: resolvedTargetName,
          status: "pending",
          channel,
          source,
          metadata,
        },
        { transaction }
      );
      message = `You'll be notified! We will send an in-app notification as soon as ${resolvedTargetName} is available in ${clientCity}.`;
    }

    // Provision an in-app confirmation notification so the user sees it in their notification inbox
    await InAppNotification.create(
      {
        userId: resolvedUserId,
        phone: clientPhone,
        title: "Launch Alert Activated",
        message: `We have saved your preference. You will be the first to know when ${resolvedTargetName} goes live in ${clientCity}.`,
        type: "general",
        targetType,
        targetId,
        icon: targetType === "category" && targetId.toLowerCase().includes("doc") ? "steth" : "bell",
        isRead: false,
        metadata: {
          subscriptionId: subscriptionRecord.id,
          targetName: resolvedTargetName,
          subscribedAt: new Date().toISOString(),
        },
      },
      { transaction }
    );

    await transaction.commit();

    return successResponse(
      res,
      {
        subscription: subscriptionRecord,
        isSubscribed: true,
        targetName: resolvedTargetName,
        targetType,
        targetId,
      },
      message,
      201
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to register notification request", 500, error);
  }
};

/**
 * 2. Check if Client is Already Subscribed to a Coming Soon Service / Category
 * GET /api/v1/client/notify-me/status
 */
const getNotifyMeStatus = async (req, res) => {
  try {
    const { targetId, targetType = "category", phone: queryPhone } = req.query;

    if (!targetId) {
      return errorResponse(res, "targetId query parameter is required.", 400);
    }

    const cleanPhone = cleanPhoneNumber(req.user?.phone || queryPhone);

    if (!cleanPhone) {
      return successResponse(res, { isSubscribed: false }, "No phone identifier provided");
    }

    const subscription = await NotifyMe.findOne({
      where: {
        phone: cleanPhone,
        targetType: targetType.toLowerCase().trim(),
        targetId: targetId.toString().trim(),
        status: "pending",
      },
    });

    return successResponse(
      res,
      {
        isSubscribed: Boolean(subscription),
        subscription: subscription || null,
      },
      subscription
        ? "Client is subscribed to launch notifications"
        : "Client is not subscribed"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to check subscription status", 500, error);
  }
};

/**
 * 3. Get Client's In-App Notifications
 * GET /api/v1/client/notifications
 */
const getClientNotifications = async (req, res) => {
  try {
    let cleanPhone = "";
    let userId = null;

    if (req.user && req.user.role !== 'admin') {
      cleanPhone = cleanPhoneNumber(req.user.phone || "");
      userId = req.user.id || null;
    } else {
      const rawPhone = req.user?.phone || req.query.phone || "";
      cleanPhone = cleanPhoneNumber(rawPhone);
      userId = req.user?.id || req.query.userId || null;
    }

    if (!cleanPhone && !userId) {
      return errorResponse(
        res,
        "Authentication token or phone query parameter is required to view notifications.",
        400
      );
    }

    const { unreadOnly = "false", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageSize;

    const where = {};
    if (userId && cleanPhone) {
      where[Op.or] = [{ userId }, { phone: cleanPhone }];
    } else if (userId) {
      where.userId = userId;
    } else {
      where.phone = cleanPhone;
    }

    if (unreadOnly === "true") {
      where.isRead = false;
    }

    const { rows: notifications, count: total } = await InAppNotification.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    });

    const unreadCountWhere = { ...where, isRead: false };
    delete unreadCountWhere.isRead;
    unreadCountWhere.isRead = false;

    const unreadCount = await InAppNotification.count({
      where: unreadCountWhere,
    });

    return successResponse(
      res,
      {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      "Notifications retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve notifications", 500, error);
  }
};

/**
 * 4. Mark an In-App Notification as Read
 * PATCH /api/v1/client/notifications/:id/read
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const rawPhone = req.user?.phone || req.query.phone || req.body?.phone;
    const cleanPhone = cleanPhoneNumber(rawPhone);

    const notification = await InAppNotification.findByPk(id);
    if (!notification) {
      return errorResponse(res, "Notification not found", 404);
    }

    // Verify ownership if user phone is available
    if (cleanPhone && notification.phone !== cleanPhone && req.user?.role !== "admin") {
      return errorResponse(res, "Unauthorized to update this notification", 403);
    }

    await notification.update({
      isRead: true,
      readAt: new Date(),
    });

    return successResponse(res, notification, "Notification marked as read");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to mark notification as read", 500, error);
  }
};

/**
 * 5. Mark All Notifications as Read for Current Client
 * PATCH /api/v1/client/notifications/mark-all-read
 */
const markAllNotificationsAsRead = async (req, res) => {
  try {
    let cleanPhone = "";
    let userId = null;

    if (req.user && req.user.role !== 'admin') {
      cleanPhone = cleanPhoneNumber(req.user.phone || "");
      userId = req.user.id || null;
    } else {
      const rawPhone = req.user?.phone || req.body?.phone || req.query?.phone;
      cleanPhone = cleanPhoneNumber(rawPhone);
      userId = req.user?.id || null;
    }

    if (!cleanPhone && !userId) {
      return errorResponse(res, "User authentication or phone is required", 400);
    }

    const where = {};
    if (userId && cleanPhone) {
      where[Op.or] = [{ userId }, { phone: cleanPhone }];
    } else if (userId) {
      where.userId = userId;
    } else {
      where.phone = cleanPhone;
    }
    where.isRead = false;

    const [updatedCount] = await InAppNotification.update(
      {
        isRead: true,
        readAt: new Date(),
      },
      { where }
    );

    return successResponse(
      res,
      { updatedCount },
      `Marked ${updatedCount} notification(s) as read`
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to mark all notifications as read", 500, error);
  }
};

// =========================================================================
// ADMIN-FACING CONTROLLERS
// =========================================================================

/**
 * 6. Admin: List "Notify Me" Subscriptions with Metrics & Filtering
 * GET /api/v1/admin/notify-me
 */
const getAdminNotifyRequests = async (req, res) => {
  try {
    const {
      targetType,
      targetId,
      status, // 'all', 'pending', 'notified'
      city,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const where = {};

    if (targetType && targetType !== "all") {
      where.targetType = targetType;
    }
    if (targetId && targetId !== "all") {
      where.targetId = targetId;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (city && city !== "all") {
      where.city = city.toLowerCase().trim();
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      where[Op.or] = [
        sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), { [Op.like]: q }),
        sequelize.where(sequelize.fn("LOWER", sequelize.col("phone")), { [Op.like]: q }),
        sequelize.where(sequelize.fn("LOWER", sequelize.col("targetName")), { [Op.like]: q }),
        sequelize.where(sequelize.fn("LOWER", sequelize.col("city")), { [Op.like]: q }),
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    const { rows: requests, count: total } = await NotifyMe.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "phone", "email"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    });

    // Aggregation summary by targetId
    const summaryRows = await NotifyMe.findAll({
      attributes: [
        "targetType",
        "targetId",
        "targetName",
        [sequelize.fn("COUNT", sequelize.col("id")), "totalSubscribers"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")
          ),
          "pendingSubscribers",
        ],
      ],
      group: ["targetType", "targetId", "targetName"],
      raw: true,
    });

    const totalPending = await NotifyMe.count({ where: { status: "pending" } });

    return successResponse(
      res,
      {
        requests,
        metrics: {
          totalRequests: total,
          totalPending,
          breakdownByTarget: summaryRows.map((r) => ({
            targetType: r.targetType,
            targetId: r.targetId,
            targetName: r.targetName,
            totalSubscribers: parseInt(r.totalSubscribers, 10) || 0,
            pendingSubscribers: parseInt(r.pendingSubscribers, 10) || 0,
          })),
        },
        pagination: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      "Notify Me subscriber list retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error.message || "Failed to retrieve notify requests", 500, error);
  }
};

/**
 * 7. Admin: Broadcast Launch Notification to All Waiting Subscribers
 * Sends In-App Notifications to all clients subscribed to a Category or Service
 * POST /api/v1/admin/notify-me/broadcast
 */
const broadcastComingSoonLaunch = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      targetType = "category",
      targetId,
      title: customTitle,
      message: customMessage,
      actionUrl: customActionUrl,
      city, // optional: filter by city e.g. 'mumbai'
    } = req.body;

    if (!targetId) {
      await transaction.rollback();
      return errorResponse(res, "targetId (e.g. 'doctors' or 'consult') is required.", 400);
    }

    const where = {
      targetType: targetType.toLowerCase().trim(),
      targetId: targetId.toString().trim(),
      status: "pending",
    };

    if (city && city !== "all") {
      where.city = city.toLowerCase().trim();
    }

    // Fetch all pending subscribers for this target
    const pendingSubscribers = await NotifyMe.findAll({
      where,
      transaction,
    });

    if (pendingSubscribers.length === 0) {
      await transaction.rollback();
      return errorResponse(
        res,
        `No pending subscribers found for ${targetType} '${targetId}'${city ? ` in ${city}` : ""}.`,
        404
      );
    }

    const sample = pendingSubscribers[0];
    const targetDisplayName = sample.targetName || targetId;
    const isDoctor = targetDisplayName.toLowerCase().includes("doc") || targetId.toLowerCase().includes("doc");

    const notificationTitle =
      customTitle ||
      `${targetDisplayName} is Now Live! ${isDoctor ? "🩺" : "🎉"}`;

    const defaultMsg = isDoctor
      ? `Great news! Verified doctors are now available for home visits and consultations in your city. Book your appointment with Eldoria Care today.`
      : `Great news! ${targetDisplayName} has officially launched. Explore available services and book your visit now.`;

    const notificationBody = customMessage || defaultMsg;
    const actionUrl =
      customActionUrl ||
      (targetType === "category" ? `/services?category=${targetId}` : `/services/${targetId}`);

    const now = new Date();

    // 1. Bulk create in-app notifications
    const inAppPayloads = pendingSubscribers.map((sub) => ({
      userId: sub.userId || null,
      phone: sub.phone,
      title: notificationTitle,
      message: notificationBody,
      type: "coming_soon_launch",
      targetType,
      targetId,
      actionUrl,
      icon: isDoctor ? "steth" : "bell",
      isRead: false,
      metadata: {
        subscriptionId: sub.id,
        targetName: targetDisplayName,
        broadcastedAt: now.toISOString(),
      },
    }));

    await InAppNotification.bulkCreate(inAppPayloads, { transaction });

    // 2. Mark subscriber requests as 'notified'
    const subscriberIds = pendingSubscribers.map((s) => s.id);
    await NotifyMe.update(
      {
        status: "notified",
        notifiedAt: now,
      },
      {
        where: { id: { [Op.in]: subscriberIds } },
        transaction,
      }
    );

    await transaction.commit();

    return successResponse(
      res,
      {
        notifiedUsersCount: pendingSubscribers.length,
        targetType,
        targetId,
        targetName: targetDisplayName,
        title: notificationTitle,
        message: notificationBody,
        actionUrl,
      },
      `Successfully broadcasted in-app launch notifications to ${pendingSubscribers.length} waiting client(s).`
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return errorResponse(res, error.message || "Failed to broadcast launch notification", 500, error);
  }
};

/**
 * 8. Admin: Delete or Cancel a Notify Me Request
 * DELETE /api/v1/admin/notify-me/:id
 */
const deleteAdminNotifyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await NotifyMe.findByPk(id);

    if (!record) {
      return errorResponse(res, "Notify request not found", 404);
    }

    await record.destroy();
    return successResponse(res, { id }, "Notify request deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message || "Failed to delete notify request", 500, error);
  }
};

module.exports = {
  subscribeNotifyMe,
  getNotifyMeStatus,
  getClientNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAdminNotifyRequests,
  broadcastComingSoonLaunch,
  deleteAdminNotifyRequest,
};
