import express from 'express';
import { getBookingListDashboard, getVINStatus } from '../controllers/bookingListController.js';

const router = express.Router();

/**
 * BookingList Routes
 * Handles BookingList specific endpoints with VIN matching
 */

// GET /api/booking-list/dashboard - Get BookingList dashboard data with VIN matching
router.get('/dashboard', getBookingListDashboard);

// GET /api/booking-list/vin-status/:vin - Check VIN matching status
router.get('/vin-status/:vin', getVINStatus);

export default router;
