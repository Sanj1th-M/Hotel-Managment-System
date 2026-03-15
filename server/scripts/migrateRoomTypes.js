/**
 * Migration: Update room_type CHECK constraint from standard/deluxe/suite to AC/NON AC/VIP
 * Run once with: node scripts/migrateRoomTypes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrate = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find existing room_type check constraint name
        const res = await client.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'rooms'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%room_type%'
        `);

        if (res.rows.length > 0) {
            const constraintName = res.rows[0].conname;
            await client.query(`ALTER TABLE rooms DROP CONSTRAINT "${constraintName}"`);
            console.log(`Dropped old constraint: ${constraintName}`);
        } else {
            console.log('No existing room_type constraint found, adding new one.');
        }

        // Add new constraint
        await client.query(`
            ALTER TABLE rooms
            ADD CONSTRAINT rooms_room_type_check
            CHECK (room_type IN ('AC', 'NON AC', 'VIP'))
        `);

        await client.query('COMMIT');
        console.log('Migration complete! room_type now accepts: AC, NON AC, VIP');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
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
