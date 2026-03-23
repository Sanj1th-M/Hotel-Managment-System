const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        await pool.query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check`);
        await pool.query(`ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check CHECK (booking_status IN ('Pending', 'confirmed', 'cancelled', 'completed'))`);
        await pool.query(`ALTER TABLE bookings ALTER COLUMN booking_status SET DEFAULT 'Pending'`);
        await pool.query(`ALTER TABLE bookings DROP COLUMN IF EXISTS payment_id`);
        await pool.query(`DROP TABLE IF EXISTS payments`);
        console.log('Migration OK');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
