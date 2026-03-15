/**
 * Migration: Add User Booking System Support
 * - Extends users table: adds phone, age, photo_url; updates role CHECK to include 'user'
 * - Extends users table: adds phone, age, photo_url; updates role CHECK to include 'user'
 * - Extends bookings table: adds persons
 *
 * Run with: node scripts/migrateForUserBooking.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrate = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── 1. Extend users table ─────────────────────────────────────────────
        // Add phone column if missing
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE users ADD COLUMN phone VARCHAR(20);
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;
        `);

        // Add age column if missing
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE users ADD COLUMN age INTEGER;
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;
        `);

        // Add photo_url column if missing
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE users ADD COLUMN photo_url TEXT;
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;
        `);

        // Drop old role CHECK and add new one that includes 'user'
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
                ALTER TABLE users ADD CONSTRAINT users_role_check
                    CHECK (role IN ('admin', 'staff', 'user'));
            EXCEPTION WHEN others THEN NULL;
            END $$;
        `);

        // ── 2. Extend bookings table ──────────────────────────────────────────
        // Add persons column if missing
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE bookings ADD COLUMN persons INTEGER DEFAULT 1 CHECK (persons >= 1 AND persons <= 10);
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;
        `);




        await client.query('COMMIT');
        console.log('✅ Migration completed successfully.');
        console.log('   - users: added phone, age, photo_url columns; role now supports user');
        console.log('   - bookings: added persons columns');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
};

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
