/**
 * Booking Controller
 * - createBooking uses a PostgreSQL transaction with FOR UPDATE row lock
 *   to prevent double-booking race conditions (TOCTOU fix)
 * - All other handlers use parameterized queries (SQL injection safe)
 */
const { body, query } = require('express-validator');
const BookingModel = require('../models/Booking');
const RoomModel = require('../models/Room');
const pool = require('../config/db');

// ─── Validation rules ─────────────────────────────────────────────────────────
const bookingValidation = [
    body('guestName').trim().notEmpty().withMessage('Guest name is required').isLength({ max: 100 }),
    body('guestPhone')
        .trim().notEmpty().withMessage('Guest phone is required')
        .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Invalid phone number'),
    body('guestEmail')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('roomId').notEmpty().isInt({ min: 1 }).withMessage('Valid room ID (positive integer) is required'),
    body('checkInDate').isISO8601().withMessage('Valid check-in date required'),
    body('checkOutDate').isISO8601().withMessage('Valid check-out date required'),
    body('notes').optional().isString().trim().isLength({ max: 500 }),
];

// Separate validation for updates — all fields optional but validated if present
const bookingUpdateValidation = [
    body('guestName').optional().trim().notEmpty().withMessage('Guest name cannot be empty').isLength({ max: 100 }),
    body('guestPhone')
        .optional().trim().notEmpty().withMessage('Guest phone cannot be empty')
        .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Invalid phone number'),
    body('guestEmail')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('checkInDate').optional().isISO8601().withMessage('Valid check-in date required'),
    body('checkOutDate').optional().isISO8601().withMessage('Valid check-out date required'),
    body('bookingStatus').optional().isIn(['confirmed', 'completed', 'cancelled']).withMessage('Invalid booking status'),
    body('notes').optional().isString().trim().isLength({ max: 500 }),
];

// Query param validation for GET /api/bookings
const bookingQueryValidation = [
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO8601 date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO8601 date'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

// ─── GET /api/bookings ────────────────────────────────────────────────────────
const getBookings = async (req, res, next) => {
    try {
        const {
            status, roomNumber, guestName, guestPhone,
            startDate, endDate, page = 1, limit = 20,
        } = req.query;

        const filters = {};

        if (status) filters.status = status;
        if (guestName) filters.guestName = guestName;
        if (guestPhone) filters.guestPhone = guestPhone;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        // Filter by room number — resolve room_number → room_id first
        if (roomNumber) {
            const room = await RoomModel.findByNumber(parseInt(roomNumber, 10));
            if (room) {
                filters.roomId = room.id;
            } else {
                return res.status(200).json({ success: true, count: 0, total: 0, data: [] });
            }
        }

        const { rows: bookings, total } = await BookingModel.findAll(filters, page, limit);

        res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: bookings,
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/bookings ───────────────────────────────────────────────────────
/**
 * RACE CONDITION FIX:
 * The entire booking creation — room lookup, overlap check, INSERT, and room
 * status update — runs inside a single serialisable DB transaction with a
 * SELECT FOR UPDATE row-level lock on the rooms row. This guarantees that no
 * two concurrent requests can book the same room for the same dates.
 */
const createBooking = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { guestName, guestPhone, guestEmail, roomId, checkInDate, checkOutDate, notes } = req.body;

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        if (checkOut <= checkIn) {
            return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date.' });
        }

        await client.query('BEGIN');

        // Lock the room row exclusively — blocks concurrent booking attempts for this room
        const roomResult = await client.query(
            'SELECT * FROM rooms WHERE id = $1 FOR UPDATE',
            [parseInt(roomId, 10)]
        );

        if (roomResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        const roomRow = roomResult.rows[0];

        if (roomRow.status === 'maintenance') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Room is under maintenance and cannot be booked.' });
        }

        // Overlap check inside the transaction — safe from race conditions
        const overlapResult = await client.query(
            `SELECT 1 FROM bookings
             WHERE room_id = $1
               AND booking_status = 'confirmed'
               AND check_in_date  < $3
               AND check_out_date > $2`,
            [roomRow.id, checkInDate, checkOutDate]
        );

        if (overlapResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                success: false,
                message: 'Room is not available for the selected dates. Please choose different dates or a different room.',
            });
        }

        // Calculate total price
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalPrice = nights * parseFloat(roomRow.price_per_night);

        // Insert the booking
        const bookingResult = await client.query(
            `INSERT INTO bookings
                (guest_name, guest_phone, guest_email, room_id, check_in_date, check_out_date,
                 total_price, booking_status, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9)
             RETURNING id`,
            [
                guestName,
                guestPhone,
                guestEmail || null,
                roomRow.id,
                checkInDate,
                checkOutDate,
                totalPrice,
                notes || '',
                req.user.id,
            ]
        );

        await client.query('COMMIT');

        // Fetch fully-joined booking after the transaction completes
        const booking = await BookingModel.findById(bookingResult.rows[0].id);

        res.status(201).json({ success: true, message: 'Booking created successfully.', data: booking });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        next(error);
    } finally {
        client.release();
    }
};

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
const getBookingById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const booking = await BookingModel.findById(id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        next(error);
    }
};

// ─── PUT /api/bookings/:id ────────────────────────────────────────────────────
const updateBooking = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const { guestName, guestPhone, guestEmail, checkInDate, checkOutDate, bookingStatus, notes } = req.body;

        await client.query('BEGIN');

        const bookingResult = await client.query(
            'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (bookingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const bookingRow = bookingResult.rows[0];

        if (bookingRow.booking_status === 'cancelled') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Cannot modify a cancelled booking.' });
        }
        if (bookingRow.booking_status === 'completed' && bookingStatus !== 'cancelled') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Completed booking cannot be modified.' });
        }

        const checkIn = checkInDate ? new Date(checkInDate) : new Date(bookingRow.check_in_date);
        const checkOut = checkOutDate ? new Date(checkOutDate) : new Date(bookingRow.check_out_date);

        if (checkOut <= checkIn) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
        }

        // Re-check availability if dates are changing (inside transaction)
        if (checkInDate || checkOutDate) {
            const overlapResult = await client.query(
                `SELECT 1 FROM bookings
                 WHERE room_id = $1
                   AND booking_status = 'confirmed'
                   AND id <> $4
                   AND check_in_date  < $3
                   AND check_out_date > $2`,
                [
                    bookingRow.room_id,
                    checkIn.toISOString().split('T')[0],
                    checkOut.toISOString().split('T')[0],
                    id,
                ]
            );

            if (overlapResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ success: false, message: 'Room is not available for the selected dates.' });
            }
        }

        // Recalculate total price if dates changed
        let totalPrice = parseFloat(bookingRow.total_price);
        if (checkInDate || checkOutDate) {
            const roomResult = await client.query('SELECT price_per_night FROM rooms WHERE id = $1', [bookingRow.room_id]);
            if (roomResult.rows.length > 0) {
                const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                totalPrice = nights * parseFloat(roomResult.rows[0].price_per_night);
            }
        }

        // Build the update payload
        const setClauses = [
            `check_in_date  = $1`,
            `check_out_date = $2`,
            `total_price    = $3`,
        ];
        const values = [
            checkIn.toISOString().split('T')[0],
            checkOut.toISOString().split('T')[0],
            totalPrice,
        ];
        let idx = 4;

        if (guestName !== undefined) { setClauses.push(`guest_name  = $${idx++}`); values.push(guestName); }
        if (guestPhone !== undefined) { setClauses.push(`guest_phone = $${idx++}`); values.push(guestPhone); }
        if (guestEmail !== undefined) { setClauses.push(`guest_email = $${idx++}`); values.push(guestEmail || null); }
        if (notes !== undefined) { setClauses.push(`notes       = $${idx++}`); values.push(notes); }

        // Handle status transitions & room side-effects within transaction
        if (bookingStatus && bookingStatus !== bookingRow.booking_status) {
            setClauses.push(`booking_status = $${idx++}`);
            values.push(bookingStatus);

            if (bookingStatus === 'cancelled') {
                await client.query(`UPDATE rooms SET status = 'available' WHERE id = $1`, [bookingRow.room_id]);
            } else if (bookingStatus === 'completed') {
                await client.query(`UPDATE rooms SET status = 'cleaning' WHERE id = $1`, [bookingRow.room_id]);
            }
        }

        values.push(id);
        await client.query(
            `UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $${idx}`,
            values
        );

        await client.query('COMMIT');

        const updated = await BookingModel.findById(id);
        res.status(200).json({ success: true, message: 'Booking updated successfully.', data: updated });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        next(error);
    } finally {
        client.release();
    }
};

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
const deleteBooking = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const booking = await BookingModel.findById(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (booking.bookingStatus === 'confirmed' && booking.room) {
            await RoomModel.updateRoom(booking.room.id, { status: 'available' });
        }

        await BookingModel.deleteBooking(id);

        res.status(200).json({ success: true, message: 'Booking deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBookings,
    createBooking,
    getBookingById,
    updateBooking,
    deleteBooking,
    bookingValidation,
    bookingUpdateValidation,
    bookingQueryValidation,
};
