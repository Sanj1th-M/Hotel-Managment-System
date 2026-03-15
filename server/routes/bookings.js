const express = require('express');
const router = express.Router();
const {
    getBookings,
    createBooking,
    getBookingById,
    updateBooking,
    deleteBooking,
    bookingValidation,
    bookingUpdateValidation,
    bookingQueryValidation,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/errorHandler');

// All routes require authentication
router.use(protect);

// GET /api/bookings (with date query validation)
router.get('/', bookingQueryValidation, validate, getBookings);

// POST /api/bookings
router.post('/', bookingValidation, validate, createBooking);

// GET /api/bookings/:id
router.get('/:id', getBookingById);

// PUT /api/bookings/:id
router.put('/:id', bookingUpdateValidation, validate, updateBooking);

// DELETE /api/bookings/:id — Admin only
router.delete('/:id', requireRole('admin'), deleteBooking);

// Alias: POST /api/bookings/book-room -> createBooking
router.post('/book-room', bookingValidation, validate, createBooking);

// Alias: PUT /api/bookings/admin/update-booking-status/:id -> updateBooking
router.put('/admin/update-booking-status/:id', requireRole('admin'), bookingUpdateValidation, validate, updateBooking);

module.exports = router;
