/**
 * Database Initialization Script
 * Creates all required PostgreSQL tables if they do not already exist.
 * Run once with: node scripts/initDb.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Users ─────────────────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            SERIAL PRIMARY KEY,
                username      VARCHAR(100) NOT NULL,
                email         VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role          VARCHAR(20)  NOT NULL DEFAULT 'staff'
                              CHECK (role IN ('admin', 'staff', 'user')),
                phone         VARCHAR(20),
                age           INTEGER,
                photo_url     TEXT,
                is_active     BOOLEAN DEFAULT TRUE,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ── Rooms ─────────────────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                id              SERIAL PRIMARY KEY,
                room_number     INTEGER UNIQUE NOT NULL,
                room_type       VARCHAR(50) NOT NULL
                                CHECK (room_type IN ('AC', 'NON AC', 'VIP')),
                price_per_night NUMERIC(10, 2) NOT NULL CHECK (price_per_night >= 0),
                status          VARCHAR(20) DEFAULT 'available'
                                CHECK (status IN ('available', 'booked', 'occupied', 'maintenance', 'cleaning')),
                capacity        INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 10),
                floor_number    INTEGER NOT NULL CHECK (floor_number >= 1),
                description     TEXT DEFAULT '',
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ── Bookings ──────────────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id              SERIAL PRIMARY KEY,
                guest_name      VARCHAR(255) NOT NULL,
                guest_phone     VARCHAR(20)  NOT NULL,
                guest_email     VARCHAR(255),
                room_id         INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                check_in_date   DATE NOT NULL,
                check_out_date  DATE NOT NULL,
                total_price     NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
                booking_status  VARCHAR(20) DEFAULT 'Pending'
                                CHECK (booking_status IN ('Pending', 'confirmed', 'cancelled', 'completed')),
                persons         INTEGER DEFAULT 1 CHECK (persons >= 1 AND persons <= 10),
                notes           TEXT DEFAULT '',
                created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_dates CHECK (check_out_date > check_in_date)
            );
        `);



        // ── Revoked Tokens (JTI denylist for token revocation) ────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti        UUID PRIMARY KEY,
                user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP NOT NULL,
                revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Index for fast TTL cleanup: DELETE FROM revoked_tokens WHERE expires_at < NOW()
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires
            ON revoked_tokens (expires_at);
        `);

        await client.query('COMMIT');
        console.log('✅ Database tables created successfully.');
        console.log('   Tables: users, rooms, bookings');
        console.log('\n   Next step: node scripts/seed.js');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create tables:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
};

createTables().catch((err) => {
    console.error(err);
    process.exit(1);
});
