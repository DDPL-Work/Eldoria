const express = require("express");
const router = express.Router();
const { verifyToken, requireAdmin } = require("../middlewares/auth.middleware");
const {getStaffRequests,getStaffRequestById,verifyStaffRequest,rejectStaffRequest,getClients,getClientByClientId,
  getBookings,getBookingById,} = require("../controllers/admin.controller");
const {getDashboardData,confirmBooking,assignStaffToBooking,unassignStaffFromBooking,} = require("../controllers/dashboard.controller");

const {getCities,getCityById,createCity,updateCity,toggleCityStatus,deleteCity,} = require("../controllers/city.controller");

// Dashboard care-desk metrics & data
router.get("/dashboard", verifyToken, requireAdmin, getDashboardData);


// Bookings management routes
router.get("/bookings", verifyToken, requireAdmin, getBookings);
router.get("/booking/:id", verifyToken, requireAdmin, getBookingById);



// City management CRUD routes
router.get("/cities", verifyToken, requireAdmin, getCities);
router.get("/cities/:id", verifyToken, requireAdmin, getCityById);
router.post("/cities", verifyToken, requireAdmin, createCity);
router.patch("/cities/:id", verifyToken, requireAdmin, updateCity);
router.patch("/cities/:id/status", verifyToken, requireAdmin, toggleCityStatus);
router.delete("/cities/:id", verifyToken, requireAdmin, deleteCity);




// Staff registration request management routes (supports both /staff-requests and /staff aliases)
router.get("/staff-requests", verifyToken, requireAdmin, getStaffRequests);
router.get("/staff-requests/:id", verifyToken, requireAdmin, getStaffRequestById);



// Verify / approve staff registration request (supports PATCH & POST)
router.patch("/staff-requests/:id/approve", verifyToken, requireAdmin, verifyStaffRequest);

// Reject staff registration request (supports PATCH & POST)
router.patch("/staff-requests/:id/reject", verifyToken, requireAdmin, rejectStaffRequest);



// Client management routes
router.get("/clients", verifyToken, requireAdmin, getClients);
router.get("/clients/:clientId", verifyToken, requireAdmin, getClientByClientId);
router.get("/client/:clientId", verifyToken, requireAdmin, getClientByClientId);

module.exports = router;

