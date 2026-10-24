const { Op } = require('sequelize');
const { Booking, Enquiry, Staff, User, sequelize } = require('../database/models');
const { successResponse, errorResponse } = require('../utills/responseHandler');
const { checkAndMarkDateExceededBookings } = require('../services/bookingExpiry.service');

/**
 * Standard city map for formatted display names
 */
const CITY_NAMES = {
  mumbai: 'Mumbai',
  thane: 'Thane',
  'navi-mumbai': 'Navi Mumbai',
  pune: 'Pune',
  nashik: 'Nashik',
  nagpur: 'Nagpur',
  delhi: 'Delhi',
  gurugram: 'Gurugram',
  noida: 'Noida',
  bengaluru: 'Bengaluru',
  hyderabad: 'Hyderabad',
  chennai: 'Chennai',
  kolkata: 'Kolkata',
  ahmedabad: 'Ahmedabad',
  surat: 'Surat',
  jaipur: 'Jaipur',
  lucknow: 'Lucknow',
  chandigarh: 'Chandigarh',
  indore: 'Indore',
  goa: 'Goa',
  dehradun: 'Dehradun'
};

const getCityDisplayName = (cid = '') => {
  if (!cid || cid === 'all') return 'All cities';
  const clean = String(cid).toLowerCase().trim();
  return CITY_NAMES[clean] || (clean.charAt(0).toUpperCase() + clean.slice(1));
};

/**
 * Format date YYYY-MM-DD
 */
const getTodayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Days of week and month names for Care Desk greeting banner
 */
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 1. GET /api/v1/admin/dashboard
 * Aggregates all KPI metrics, alerts, needs-action queue, staff availability, and city breakdowns
 */
const getDashboardData = async (req, res) => {
  try {
    const { city = 'all' } = req.query;
    const selectedCity = String(city).trim().toLowerCase();
    const todayStr = getTodayISO();

    // Automatically check and mark overdue unconfirmed bookings as 'date_exceeded'
    await checkAndMarkDateExceededBookings({ city }).catch((err) => {
      console.warn('Date exceeded check warning in dashboard:', err.message);
    });

    // 1. Prepare City Filters
    const isCityFiltered = selectedCity !== 'all' && selectedCity !== '';
    const bookingCityWhere = isCityFiltered ? { city: selectedCity } : {};
    const enquiryCityWhere = isCityFiltered ? { city: selectedCity } : {};
    const staffCityWhere = isCityFiltered ? { city: selectedCity } : {};

    // 2. Fetch Bookings (matching city filter)
    const bookings = await Booking.findAll({
      where: bookingCityWhere,
      order: [
        ['date', 'ASC'],
        ['time', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    // 3. Fetch Staff (Approved list + all staff for duty counts)
    const allStaff = await Staff.findAll({
      where: staffCityWhere,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'isActive', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const approvedStaff = allStaff.filter((s) => s.approval === 'approved');
    const pendingStaffApps = allStaff.filter((s) => s.approval === 'pending');

    // 4. Fetch Enquiries / Help Requests
    const enquiries = await Enquiry.findAll({
      where: enquiryCityWhere,
      order: [['createdAt', 'DESC']]
    });
    const newHelpRequests = enquiries.filter((e) => e.status === 'new');

    // 5. Compute KPI Metrics
    const newReqBookings = bookings.filter((b) => b.status === 'requested');
    const countNewReq = newReqBookings.length;

    const visitsToday = bookings.filter((b) => b.date === todayStr && b.status !== 'cancelled');
    const countTodayVisits = visitsToday.length;
    const countTodayCompleted = visitsToday.filter((b) => b.status === 'completed').length;
    const countTodayOpen = Math.max(0, countTodayVisits - countTodayCompleted);

    const countStaffOnDuty = approvedStaff.filter((s) => s.onDuty).length;
    const countStaffTotal = approvedStaff.length;

    const unassignedBookings = bookings.filter(
      (b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId
    );
    const countUnassigned = unassignedBookings.length;

    const dateExceededBookings = bookings.filter((b) => {
      const cmpDate = b.endDate || b.date;
      return (
        b.status === 'date_exceeded' ||
        (Boolean(cmpDate) && cmpDate < todayStr && !['completed', 'cancelled'].includes(b.status))
      );
    });
    const countDateExceeded = dateExceededBookings.length;

    // 6. Needs Action Queue (status IN requested, confirmed)
    const queueBookings = bookings.filter((b) => ['requested', 'confirmed'].includes(b.status));

    const needsAction = queueBookings.slice(0, 15).map((b) => {
      const sDate = b.startDate || b.date;
      const eDate = b.endDate || sDate;
      const sTime = b.startTime || b.time;
      const eTime = b.endTime || null;
      const isToday = sDate === todayStr;
      const datePart = (eDate && eDate !== sDate) ? `${sDate} to ${eDate}` : (isToday ? 'Today' : sDate);
      const timePart = eTime ? `${sTime} - ${eTime}` : sTime;
      const whenFormatted = timePart ? `${datePart}, ${timePart}` : datePart;

      return {
        id: b.id,
        code: b.code,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        patientName: b.patientName,
        patientAge: b.patientAge,
        relation: b.relation,
        service: b.service,
        serviceName: b.serviceName || b.service,
        plan: b.plan || 'Single visit',
        city: b.city,
        cityName: getCityDisplayName(b.city),
        area: b.area,
        address: b.address,
        date: b.date,
        time: b.time,
        startDate: sDate,
        endDate: eDate,
        startTime: sTime,
        endTime: eTime,
        isToday,
        whenFormatted,
        source: b.source || 'App',
        status: b.status,
        staffId: b.staffId || null,
        price: b.price,
        createdAt: b.createdAt
      };
    });

    // 7. Staff Availability List (Approved staff)
    const staffAvailability = approvedStaff.slice(0, 10).map((s) => ({
      id: s.id,
      staffId: s.staffId,
      name: s.user?.name || s.staffId,
      phone: s.user?.phone || '',
      role: s.qualification || 'Caregiver',
      city: s.city,
      cityName: getCityDisplayName(s.city),
      area: s.area || '',
      onDuty: Boolean(s.onDuty),
      docs: s.docs,
      approval: s.approval
    }));

    // 8. Alerts
    const alerts = {
      helpRequests: {
        count: newHelpRequests.length,
        title: `${newHelpRequests.length} new help request: customers not sure what care they need`,
        items: newHelpRequests.slice(0, 5).map((e) => ({
          id: e.id,
          code: e.code,
          clientName: e.clientName,
          clientPhone: e.clientPhone,
          patientType: e.patientType || 'Elderly care',
          city: e.city,
          cityName: getCityDisplayName(e.city),
          area: e.area,
          createdAt: e.createdAt
        }))
      },
      staffApplications: {
        count: pendingStaffApps.length,
        title: `${pendingStaffApps.length} staff application waiting for review`,
        items: pendingStaffApps.slice(0, 5).map((s) => ({
          id: s.id,
          staffId: s.staffId,
          name: s.user?.name || s.staffId,
          role: s.qualification || 'Nurse / Caregiver',
          city: s.city,
          cityName: getCityDisplayName(s.city),
          submittedAt: s.submittedAt || s.createdAt
        }))
      }
    };

    // 9. By City Breakdown (Always aggregated across key operating cities)
    // Fetch all bookings and staff across all cities for the byCity table
    const [allCityBookings, allCityStaff] = await Promise.all([
      Booking.findAll({ attributes: ['id', 'city', 'status', 'date', 'staffId'] }),
      Staff.findAll({ attributes: ['id', 'city', 'approval', 'onDuty'] })
    ]);

    const targetCityIds = ['mumbai', 'thane', 'navi-mumbai', 'pune'];
    const byCity = targetCityIds.map((cid) => {
      const cBookings = allCityBookings.filter((b) => (b.city || 'mumbai').toLowerCase() === cid);
      const cNewReq = cBookings.filter((b) => b.status === 'requested').length;
      const cDateExceeded = cBookings.filter((b) => b.status === 'date_exceeded').length;
      const cOpen = cBookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
      const cVisitsToday = cBookings.filter((b) => b.date === todayStr && b.status !== 'cancelled').length;
      const cUnassigned = cBookings.filter(
        (b) => ['requested', 'confirmed'].includes(b.status) && !b.staffId
      ).length;

      const cStaff = allCityStaff.filter(
        (s) => (s.city || 'mumbai').toLowerCase() === cid && s.approval === 'approved'
      );
      const cStaffOnDuty = cStaff.filter((s) => s.onDuty).length;
      const cStaffTotal = cStaff.length;

      return {
        id: cid,
        name: getCityDisplayName(cid),
        newReq: cNewReq,
        dateExceeded: cDateExceeded,
        openBookings: cOpen,
        visitsToday: cVisitsToday,
        unassigned: cUnassigned,
        staffOnDuty: cStaffOnDuty,
        staffTotal: cStaffTotal
      };
    });

    // 10. Header Greeting
    const now = new Date();
    const hr = now.getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const dayName = DOW[now.getDay()];
    const monthName = MON[now.getMonth()];
    const dateNum = now.getDate();
    const year = now.getFullYear();

    const banner = {
      greeting: greet,
      dateString: `${dayName}, ${dateNum} ${monthName} ${year}`,
      title: `Care desk${selectedCity !== 'all' ? ` · ${getCityDisplayName(selectedCity)}` : ''}`,
      subtitle: `${countNewReq} new request${countNewReq === 1 ? '' : 's'} waiting for confirmation`,
      newRequestsCount: countNewReq,
      dateExceededCount: countDateExceeded
    };

    // Construct response payload
    const payload = {
      selectedCity,
      cityName: getCityDisplayName(selectedCity),
      banner,
      kpis: {
        newRequests: {
          count: countNewReq,
          label: 'New requests',
          sublabel: 'Awaiting confirmation'
        },
        dateExceeded: {
          count: countDateExceeded,
          label: 'Date exceeded',
          sublabel: 'Scheduled date passed with no action'
        },
        visitsToday: {
          count: countTodayVisits,
          completed: countTodayCompleted,
          open: countTodayOpen,
          label: 'Visits today',
          sublabel: `${countTodayCompleted} completed · ${countTodayOpen} open`
        },
        staffOnDuty: {
          count: countStaffOnDuty,
          total: countStaffTotal,
          label: 'Staff on duty',
          sublabel: `of ${countStaffTotal} staff`
        },
        unassigned: {
          count: countUnassigned,
          label: 'Unassigned',
          sublabel: 'Need a nurse or caregiver'
        },
        dateExceeded: {
          count: countDateExceeded,
          label: 'Date exceeded',
          sublabel: 'Needs reschedule'
        }
      },
      alerts,
      needsAction,
      staffAvailability,
      byCity
    };

    return successResponse(res, payload, 'Dashboard data fetched successfully');
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    return errorResponse(res, error.message || 'Failed to fetch dashboard data', 500, error);
  }
};


/**
 * 2. GET /api/v1/admin/bookings
 * List bookings with filtering, search, and pagination
 */
const getBookings = async (req, res) => {
  try {
    const {
      status,
      city,
      service,
      date,
      search,
      page = 1,
      limit = 100
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * pageSize;

    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (city && city !== 'all') {
      where.city = { [Op.like]: `%${city.trim().toLowerCase()}%` };
    }
    if (service && service !== 'all') {
      where.service = { [Op.like]: `%${service.trim()}%` };
    }
    if (date) {
      where.date = date;
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { code: { [Op.like]: q } },
        { clientName: { [Op.like]: q } },
        { clientPhone: { [Op.like]: q } },
        { patientName: { [Op.like]: q } },
        { address: { [Op.like]: q } }
      ];
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      order: [
        ['date', 'ASC'],
        ['time', 'ASC'],
        ['createdAt', 'DESC']
      ],
      limit: pageSize,
      offset
    });

    return successResponse(
      res,
      {
        bookings,
        pagination: {
          total: count,
          currentPage: pageNum,
          totalPages: Math.ceil(count / pageSize),
          limit: pageSize
        }
      },
      'Bookings retrieved successfully'
    );
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to fetch bookings', 500, error);
  }
};

const {
  confirmBooking,
  assignStaffToBooking,
  unassignStaffFromBooking,
  updateBookingStatus,
  getAvailableStaffForBooking,
  createAdminBooking,
} = require('./booking.controller');

module.exports = {
  getDashboardData,
  getBookings,
  confirmBooking,
  assignStaffToBooking,
  unassignStaffFromBooking,
  updateBookingStatus,
  getAvailableStaffForBooking,
  createAdminBooking,
};
