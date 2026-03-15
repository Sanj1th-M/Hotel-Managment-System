/**
 * Room query module — replaces Mongoose Room model.
 * All queries use parameterized statements to prevent SQL injection.
 */
const pool = require('../config/db');

// Helper to map snake_case columns to camelCase expected by the frontend
const mapToCamelCase = (row) => ({
    id: row.id,
    roomNumber: row.room_number,
    roomType: row.room_type,
    pricePerNight: row.price_per_night,
    floorNumber: row.floor_number,
    capacity: row.capacity,
    status: row.status,
    description: row.description,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

/**
 * Retrieve all rooms, with optional filters for status and roomType.
 * @param {{ status?: string, roomType?: string }} filters
 */
const findAll = async (filters = {}) => {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.status) {
        conditions.push(`status = $${idx++}`);
        values.push(filters.status);
    }
    if (filters.roomType) {
        conditions.push(`room_type = $${idx++}`);
        values.push(filters.roomType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
        `SELECT * FROM rooms ${where} ORDER BY room_number ASC`,
        values
    );
    return result.rows.map(mapToCamelCase);
};

/**
 * Find a single room by its primary key id.
 * @param {number} id
 */
const findById = async (id) => {
    const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
    return result.rows[0] ? mapToCamelCase(result.rows[0]) : null;
};

/**
 * Find a room by its room_number.
 * @param {number} roomNumber
 */
const findByNumber = async (roomNumber) => {
    const result = await pool.query('SELECT * FROM rooms WHERE room_number = $1', [roomNumber]);
    return result.rows[0] ? mapToCamelCase(result.rows[0]) : null;
};

/**
 * Create a new room.
 * @returns {object} Created room row
 */
const createRoom = async ({ roomNumber, roomType, pricePerNight, status = 'available', capacity, floorNumber, description = '', imageUrl = null }) => {
    const result = await pool.query(
        `INSERT INTO rooms (room_number, room_type, price_per_night, status, capacity, floor_number, description, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [roomNumber, roomType, pricePerNight, status, capacity, floorNumber, description, imageUrl]
    );
    return mapToCamelCase(result.rows[0]);
};

/**
 * Update a room by id. Only updates fields that are provided.
 * @param {number} id
 * @param {object} fields
 * @returns {object|null} Updated room row or null if not found
 */
const updateRoom = async (id, fields) => {
    // Map JS camelCase to SQL snake_case column names
    const columnMap = {
        roomNumber: 'room_number',
        roomType: 'room_type',
        pricePerNight: 'price_per_night',
        status: 'status',
        capacity: 'capacity',
        floorNumber: 'floor_number',
        description: 'description',
        imageUrl: 'image_url',
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
    const result = await pool.query(
        `UPDATE rooms SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
    );
    return result.rows[0] ? mapToCamelCase(result.rows[0]) : null;
};

/**
 * Delete a room by id.
 * @param {number} id
 * @returns {object|null} Deleted room row or null if not found
 */
const deleteRoom = async (id) => {
    const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] ? mapToCamelCase(result.rows[0]) : null;
};

/**
 * Count rooms by a specific status value, or count all rooms if no status given.
 * @param {string|null} status
 */
const countByStatus = async (status = null) => {
    let result;
    if (status === null) {
        result = await pool.query('SELECT COUNT(*) FROM rooms');
    } else if (Array.isArray(status)) {
        result = await pool.query(
            `SELECT COUNT(*) FROM rooms WHERE status = ANY($1)`,
            [status]
        );
    } else {
        result = await pool.query('SELECT COUNT(*) FROM rooms WHERE status = $1', [status]);
    }
    return parseInt(result.rows[0].count, 10);
};

module.exports = { findAll, findById, findByNumber, createRoom, updateRoom, deleteRoom, countByStatus };
