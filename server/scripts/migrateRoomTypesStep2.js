/**
 * Step 2: Update existing room rows and add new constraint.
 * Run: node scripts/migrateRoomTypesStep2.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

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

        // Show existing room types before mapping
        const before = await client.query(`SELECT DISTINCT room_type FROM rooms`);
        console.log('Existing room types:', before.rows.map(r => r.room_type));

        // Map old values to new ones — edit this mapping to your preference
        await client.query(`UPDATE rooms SET room_type = 'AC'     WHERE room_type = 'standard'`);
        await client.query(`UPDATE rooms SET room_type = 'NON AC' WHERE room_type = 'deluxe'`);
        await client.query(`UPDATE rooms SET room_type = 'VIP'    WHERE room_type = 'suite'`);
        console.log('Updated old room type values.');

        // Drop constraint if it still exists (safety)
        const res = await client.query(`
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'rooms'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%room_type%'
        `);
        if (res.rows.length > 0) {
            await client.query(`ALTER TABLE rooms DROP CONSTRAINT "${res.rows[0].conname}"`);
            console.log('Dropped lingering constraint:', res.rows[0].conname);
        }

        // Add new constraint
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
