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
        'SELECT id, username, email, password_hash, role, is_active, created_at FROM users WHERE email = $1',
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
        'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Create a new user. Hashes the plain-text password before insert.
 * Returns the created user row (without password_hash).
 */
const createUser = async ({ username, email, password, role = 'staff', isActive = true }) => {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, role, is_active, created_at`,
        [username.trim(), email.toLowerCase().trim(), hash, role, isActive]
    );
    return result.rows[0];
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

module.exports = { findByEmail, findById, createUser, comparePassword };
