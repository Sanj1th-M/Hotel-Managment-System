/**
 * Database Performance Index Migration
 * Adds covering indexes on frequently-filtered and JOIN-heavy columns.
 * Safe to run on existing databases — uses CREATE INDEX IF NOT EXISTS.
 *
 * Run with: npm run addIndexes
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const addIndexes = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        logger.info('Creating performance indexes...');

        // ── bookings table ─────────────────────────────────────────────────────
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_bookings_status
            ON bookings (booking_status);
        `);
        logger.info('  ✓ idx_bookings_status');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_bookings_room_id
            ON bookings (room_id);
        `);
        logger.info('  ✓ idx_bookings_room_id');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_bookings_dates
            ON bookings (check_in_date, check_out_date);
        `);
        logger.info('  ✓ idx_bookings_dates');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_bookings_guest_name
            ON bookings USING GIN (to_tsvector('simple', guest_name));
        `);
        logger.info('  ✓ idx_bookings_guest_name (GIN full-text)');

        // ── rooms table ────────────────────────────────────────────────────────
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_rooms_status
            ON rooms (status);
        `);
        logger.info('  ✓ idx_rooms_status');

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_rooms_type
            ON rooms (room_type);
        `);
        logger.info('  ✓ idx_rooms_type');

        // ── revoked_tokens table — expires_at for cleanup queries ──────────────
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires
            ON revoked_tokens (expires_at);
        `);
        logger.info('  ✓ idx_revoked_tokens_expires');

        await client.query('COMMIT');
        logger.info('All indexes created successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err }, 'Failed to create indexes');
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
};

addIndexes().catch((err) => {
    logger.error(err);
    process.exit(1);
});
