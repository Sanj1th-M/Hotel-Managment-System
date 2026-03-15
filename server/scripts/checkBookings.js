const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    const res = await pool.query('SELECT id, guest_name, total_price, check_in_date, check_out_date FROM bookings ORDER BY id DESC LIMIT 5');
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
}
check();
