const { body, param } = require('express-validator');
const RoomModel = require('../models/Room');
const BookingModel = require('../models/Booking');

// Validation rules for creating a room (all required fields)
const roomCreateValidation = [
    body('roomNumber').isInt({ min: 1 }).withMessage('Room number must be a positive integer'),
    body('roomType').isIn(['AC', 'NON AC', 'VIP']).withMessage('Room type must be AC, NON AC, or VIP'),
    body('pricePerNight').isFloat({ min: 0 }).withMessage('Price per night must be a non-negative number'),
    body('floorNumber').isInt({ min: 1 }).withMessage('Floor number must be a positive integer'),
    body('capacity').isInt({ min: 1, max: 10 }).withMessage('Capacity must be between 1 and 10'),
    body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('Description max 500 chars'),
    body('status').optional().isIn(['available', 'booked', 'occupied', 'maintenance', 'cleaning']).withMessage('Invalid status'),
];

// Separate validation for updates — all fields optional but validated if present
const roomUpdateValidation = [
    body('roomNumber').optional().isInt({ min: 1 }).withMessage('Room number must be a positive integer'),
    body('roomType').optional().isIn(['AC', 'NON AC', 'VIP']).withMessage('Room type must be AC, NON AC, or VIP'),
    body('pricePerNight').optional().isFloat({ min: 0 }).withMessage('Price per night must be a non-negative number'),
    body('floorNumber').optional().isInt({ min: 1 }).withMessage('Floor number must be a positive integer'),
    body('capacity').optional().isInt({ min: 1, max: 10 }).withMessage('Capacity must be between 1 and 10'),
    body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('Description max 500 chars'),
    body('status').optional().isIn(['available', 'booked', 'occupied', 'maintenance', 'cleaning']).withMessage('Invalid status'),
];

/**
 * GET /api/rooms
 * Returns all rooms, optionally filtered by status and/or roomType.
 */
const getRooms = async (req, res, next) => {
    try {
        const filters = {};
        if (req.query.status) filters.status = req.query.status;
        if (req.query.roomType) filters.roomType = req.query.roomType;

        const rooms = await RoomModel.findAll(filters);
        res.status(200).json({ success: true, count: rooms.length, data: rooms });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/rooms
 * Creates a new room. Admin only.
 */
const createRoom = async (req, res, next) => {
    try {
        const { roomNumber, roomType, pricePerNight, floorNumber, capacity, description, status } = req.body;
        
        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/rooms/${req.file.filename}`;
        }

        const room = await RoomModel.createRoom({
            roomNumber,
            roomType,
            pricePerNight,
            floorNumber,
            capacity,
            description: description || '',
            status: status || 'available',
            imageUrl
        });

        res.status(201).json({ success: true, message: 'Room created successfully', data: room });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/rooms/:id
 * Updates a room's details. Admin only.
 */
const updateRoom = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid room ID.' });
        }

        const updates = req.body;
        
        if (req.file) {
            updates.imageUrl = `/uploads/rooms/${req.file.filename}`;
        }

        // Prevent changing roomNumber to one that already exists on a different room
        if (updates.roomNumber) {
            const existing = await RoomModel.findByNumber(parseInt(updates.roomNumber, 10));
            if (existing && existing.id !== id) {
                return res.status(409).json({ success: false, message: 'A room with this number already exists.' });
            }
        }

        const room = await RoomModel.updateRoom(id, updates);

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        res.status(200).json({ success: true, message: 'Room updated successfully', data: room });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/rooms/:id
 * Deletes a room. Admin only. Rejects if active bookings exist.
 */
const deleteRoom = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid room ID.' });
        }

        // Check for active confirmed bookings before deleting
        const { rows: activeBookings } = await require('../config/db').query(
            `SELECT 1 FROM bookings WHERE room_id = $1 AND booking_status = 'confirmed' LIMIT 1`,
            [id]
        );

        if (activeBookings.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete room with active bookings. Cancel or complete the bookings first.',
            });
        }

        const room = await RoomModel.deleteRoom(id);

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        res.status(200).json({ success: true, message: 'Room deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/rooms/available
 * Returns rooms available for a given date range.
 * Query params: checkInDate, checkOutDate, roomType (optional)
 */
const getAvailableRooms = async (req, res, next) => {
    try {
        const { checkInDate, checkOutDate, roomType } = req.query;

        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({ success: false, message: 'checkInDate and checkOutDate are required.' });
        }

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        if (isNaN(checkIn) || isNaN(checkOut)) {
            return res.status(400).json({ success: false, message: 'Invalid date format.' });
        }
        if (checkOut <= checkIn) {
            return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
        }

        // Single SQL query: rooms NOT in a confirmed-booking overlap AND with available/cleaning status
        const pool = require('../config/db');
        const values = [checkInDate, checkOutDate];
        let idx = 3;

        let roomTypeFilter = '';
        if (roomType) {
            roomTypeFilter = `AND r.room_type = $${idx++}`;
            values.push(roomType);
        }

        const result = await pool.query(
            `SELECT r.*
             FROM rooms r
             WHERE r.status != 'maintenance'
               ${roomTypeFilter}
               AND r.id NOT IN (
                   SELECT room_id FROM bookings
                   WHERE booking_status = 'confirmed'
                     AND check_in_date  < $2
                     AND check_out_date > $1
               )
             ORDER BY r.room_number ASC`,
            values
        );

        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        next(error);
    }
};

// Keep roomValidation as an alias for create (used in existing route POST)
const roomValidation = roomCreateValidation;

module.exports = { getRooms, createRoom, updateRoom, deleteRoom, getAvailableRooms, roomValidation, roomUpdateValidation };
