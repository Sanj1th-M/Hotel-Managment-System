/**
 * Booking query module — replaces Mongoose Booking model.
 * All queries use parameterized statements to prevent SQL injection.
 * Supports JOIN population of room and user data.
 */
const pool = require('../config/db');

/** Base SELECT with JOINs to replicate Mongoose .populate() behaviour */
const SELECT_BOOKING = `
    SELECT
        b.id,
        b.guest_name,
        b.guest_phone,
        b.guest_email,
        b.check_in_date,
        b.check_out_date,
        b.total_price,
        b.booking_status,
        b.notes,
        b.created_at,
        -- Room details
        r.id           AS room_id,
        r.room_number,
        r.room_type,
        r.price_per_night,
        r.status       AS room_status,
        r.floor_number,
        r.capacity,
        -- Creator details
        u.id           AS creator_id,
        u.username     AS creator_username,
        u.email        AS creator_email,
        u.role         AS creator_role
    FROM bookings b
    LEFT JOIN rooms   r ON b.room_id    = r.id
    LEFT JOIN users   u ON b.created_by = u.id
`;

/** Transform a raw DB row into a structured JS object (mimics Mongoose populate output) */
const toBookingObject = (row) => ({
    id: row.id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    guestEmail: row.guest_email,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    totalPrice: isNaN(parseFloat(row.total_price)) ? 0 : parseFloat(row.total_price),
    bookingStatus: row.booking_status,
    notes: row.notes,
    createdAt: row.created_at,
    room: row.room_id
        ? {
            id: row.room_id,
            roomNumber: row.room_number,
            roomType: row.room_type,
            pricePerNight: parseFloat(row.price_per_night),
            status: row.room_status,
            floorNumber: row.floor_number,
            capacity: row.capacity,
        }
        : null,
    createdBy: row.creator_id
        ? {
            id: row.creator_id,
            username: row.creator_username,
            email: row.creator_email,
            role: row.creator_role,
        }
        : null,
});

/**
 * Find all bookings with optional filters and pagination.
 * @param {object} filters - { status, guestName, guestPhone, startDate, endDate, roomId }
 * @param {number} page
 * @param {number} limit
 * @returns {{ rows: object[], total: number }}
 */
const findAll = async (filters = {}, page = 1, limit = 20) => {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.status) {
        conditions.push(`b.booking_status = $${idx++}`);
        values.push(filters.status);
    }
    if (filters.guestName) {
        conditions.push(`b.guest_name ILIKE $${idx++}`);
        values.push(`%${filters.guestName}%`);
    }
    if (filters.guestPhone) {
        conditions.push(`b.guest_phone ILIKE $${idx++}`);
        values.push(`%${filters.guestPhone}%`);
    }
    if (filters.startDate) {
        conditions.push(`b.check_in_date >= $${idx++}`);
        values.push(filters.startDate);
    }
    if (filters.endDate) {
        conditions.push(`b.check_in_date <= $${idx++}`);
        values.push(filters.endDate);
    }
    if (filters.roomId) {
        conditions.push(`b.room_id = $${idx++}`);
        values.push(filters.roomId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM bookings b ${where}`,
        values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Paginated results
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const dataResult = await pool.query(
        `${SELECT_BOOKING} ${where} ORDER BY b.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, parseInt(limit), offset]
    );

    return { rows: dataResult.rows.map(toBookingObject), total };
};

/**
 * Find a single booking by its primary key id (with JOINs).
 * @param {number} id
 */
const findById = async (id) => {
    const result = await pool.query(
        `${SELECT_BOOKING} WHERE b.id = $1`,
        [id]
    );
    return result.rows[0] ? toBookingObject(result.rows[0]) : null;
};

/**
 * Create a new booking.
 * @returns {object} Created booking (with JOINs)
 */
const createBooking = async ({ guestName, guestPhone, guestEmail, roomId, checkInDate, checkOutDate, totalPrice, bookingStatus = 'Pending', notes = '', createdBy }) => {
    const result = await pool.query(
        `INSERT INTO bookings
            (guest_name, guest_phone, guest_email, room_id, check_in_date, check_out_date, total_price, booking_status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [guestName, guestPhone, guestEmail || null, roomId, checkInDate, checkOutDate, totalPrice, bookingStatus, notes || '', createdBy]
    );
    return findById(result.rows[0].id);
};

/**
 * Update a booking by id. Only updates fields that are provided.
 * @param {number} id
 * @param {object} fields
 * @returns {object|null} Updated booking (with JOINs)
 */
const updateBooking = async (id, fields) => {
    const columnMap = {
        guestName: 'guest_name',
        guestPhone: 'guest_phone',
        guestEmail: 'guest_email',
        checkInDate: 'check_in_date',
        checkOutDate: 'check_out_date',
        totalPrice: 'total_price',
        bookingStatus: 'booking_status',
        notes: 'notes',
    };

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, col] of Object.entries(columnMap)) {
        if (fields[key] !== undefined) {
            setClauses.push(`${col} = $${idx++}`);
            values.push(fields[key]);
        }
    }

    if (setClauses.length === 0) return findById(id);

    values.push(id);
    await pool.query(
        `UPDATE bookings SET ${setClauses.join(', ')} WHERE id = $${idx}`,
        values
    );
    return findById(id);
};

/**
 * Delete a booking by id.
 * @returns {object|null} Deleted raw booking row (without JOINs) or null
 */
const deleteBooking = async (id) => {
    const result = await pool.query(
        'DELETE FROM bookings WHERE id = $1 RETURNING *',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Check if a room has any confirmed overlapping bookings in the given date range.
 * Optionally exclude a specific booking id (for update operations).
 * @param {number} roomId
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @param {number|null} excludeId
 * @returns {boolean} true if room IS available (no overlap found)
 */
const checkOverlap = async (roomId, checkIn, checkOut, excludeId = null) => {
    let query = `
        SELECT 1 FROM bookings
        WHERE room_id = $1
          AND booking_status IN ('confirmed', 'Pending')
          AND check_in_date  < $3
          AND check_out_date > $2
    `;
    const values = [roomId, checkIn, checkOut];

    if (excludeId) {
        query += ` AND id <> $4`;
        values.push(excludeId);
    }

    const result = await pool.query(query, values);
    // Return true = available (no conflict)
    return result.rows.length === 0;
};

/**
 * Count bookings matching a simple status filter.
 * @param {string|null} status
 */
const countByStatus = async (status = null) => {
    let result;
    if (status === null) {
        result = await pool.query('SELECT COUNT(*) FROM bookings');
    } else {
        result = await pool.query('SELECT COUNT(*) FROM bookings WHERE booking_status = $1', [status]);
    }
    return parseInt(result.rows[0].count, 10);
};

module.exports = { findAll, findById, createBooking, updateBooking, deleteBooking, checkOverlap, countByStatus };
