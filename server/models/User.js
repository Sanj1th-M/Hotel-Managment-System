/**
 * User query module — replaces Mongoose User model.
 * All queries use parameterized statements to prevent SQL injection.
 */
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Find a user by email. Returns the row or null.
 * @param {string} email
 */
const findByEmail = async (email) => {
    const result = await pool.query(
        'SELECT id, username, email, phone, age, photo_url, password_hash, role, is_active, created_at FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
    );
    return result.rows[0] || null;
};

/**
 * Find a user by primary key id. Returns the row without password_hash.
 * @param {number} id
 */
const findById = async (id) => {
    const result = await pool.query(
        'SELECT id, username, email, phone, age, photo_url, role, is_active, created_at FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Create a new user. Hashes the plain-text password before insert.
 * Returns the created user row (without password_hash).
 */
const createUser = async ({ username, email, password, phone = null, age = null, role = 'staff', isActive = true }) => {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, phone, age, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, email, phone, age, photo_url, role, is_active, created_at`,
        [username.trim(), email.toLowerCase().trim(), hash, phone, age, role, isActive]
    );
    return result.rows[0];
};

/**
 * Update a user's profile fields. Only updates fields that are provided.
 * @param {number} id
 * @param {object} fields - { username, phone, age, photoUrl }
 */
const updateProfile = async (id, fields) => {
    const columnMap = {
        username: 'username',
        phone: 'phone',
        age: 'age',
        photoUrl: 'photo_url',
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
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}
         RETURNING id, username, email, phone, age, photo_url, role, is_active, created_at`,
        values
    );
    return result.rows[0] || null;
};

/**
 * Replace a user's password with a newly hashed version.
 * @param {number} id
 * @param {string} newPassword
 */
const updatePassword = async (id, newPassword) => {
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
};

/**
 * Retrieve just the password hash for existing users (for password change verification).
 * @param {number} id
 */
const findPasswordHashById = async (id) => {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
    return result.rows[0]?.password_hash || null;
};

/**
 * Compare a plain-text candidate password against the stored bcrypt hash.
 * @param {string} candidate
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (candidate, hash) => {
    return bcrypt.compare(candidate, hash);
};

module.exports = { findByEmail, findById, createUser, updateProfile, updatePassword, findPasswordHashById, comparePassword };
