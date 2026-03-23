/**
 * Final migration: Drop any existing room_type constraint first (without transaction),
 * then update existing rows, then add new constraint.
 * Run: node scripts/finalMigrateRoomTypes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrate = async () => {
    const client = await pool.connect();
    try {
        // Step 1: Drop any existing room_type constraint (outside transaction so it persists)
        const res = await client.query(`
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'rooms'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%room_type%'
        `);
        if (res.rows.length > 0) {
            for (const row of res.rows) {
                await client.query(`ALTER TABLE rooms DROP CONSTRAINT IF EXISTS "${row.conname}"`);
                console.log('Dropped constraint:', row.conname);
            }
        } else {
            console.log('No existing room_type constraint found.');
        }

        // Step 2: Update existing rows to new type values
        const u1 = await client.query(`UPDATE rooms SET room_type = 'AC'     WHERE room_type = 'standard'`);
        const u2 = await client.query(`UPDATE rooms SET room_type = 'NON AC' WHERE room_type = 'deluxe'`);
        const u3 = await client.query(`UPDATE rooms SET room_type = 'VIP'    WHERE room_type = 'suite'`);
        console.log(`Updated rows: standard→AC: ${u1.rowCount}, deluxe→NON AC: ${u2.rowCount}, suite→VIP: ${u3.rowCount}`);

        // Verify no old values remain
        const check = await client.query(`SELECT room_type, COUNT(*) FROM rooms GROUP BY room_type`);
        console.log('Current room types in DB:', check.rows);

        // Step 3: Add new constraint
        await client.query(`
            ALTER TABLE rooms
            ADD CONSTRAINT rooms_room_type_check
            CHECK (room_type IN ('AC', 'NON AC', 'VIP'))
        `);

        console.log('✅ Migration complete! room_type now accepts: AC, NON AC, VIP');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
};

migrate().catch(() => process.exit(1));
