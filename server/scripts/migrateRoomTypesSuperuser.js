/**
 * Migration: Update room_type CHECK constraint
 * Runs as postgres superuser to bypass ownership restrictions.
 * Run once: node scripts/migrateRoomTypesSuperuser.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

// Use postgres superuser — password prompted via PGPASSWORD env or pg_hba trust
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'hotel_management',
    user: 'postgres',
});

const migrate = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find the existing room_type CHECK constraint
        const res = await client.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'rooms'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%room_type%'
        `);

        if (res.rows.length > 0) {
            const cname = res.rows[0].conname;
            await client.query(`ALTER TABLE rooms DROP CONSTRAINT "${cname}"`);
            console.log('Dropped old constraint:', cname);
        } else {
            console.log('No existing room_type constraint found.');
        }

        await client.query(`
            ALTER TABLE rooms
            ADD CONSTRAINT rooms_room_type_check
            CHECK (room_type IN ('AC', 'NON AC', 'VIP'))
        `);

        await client.query('COMMIT');
        console.log('✅ Migration complete! room_type now accepts: AC, NON AC, VIP');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
};

migrate().catch(() => process.exit(1));
