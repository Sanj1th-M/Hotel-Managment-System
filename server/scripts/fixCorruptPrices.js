/**
 * Fix Corrupt Prices Script
 * Identifies bookings with NaN or null total_price and recalculates them.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixPrices() {
    const client = await pool.connect();
    try {
        console.log('🔍 Searching for bookings with corrupt total_price...');

        // Find bookings where total_price is NaN or 0 (likely from the bug)
        // PostgreSQL handles NaN in NUMERIC columns, but we can check for them.
        const corruptQuery = `
            SELECT b.id, b.check_in_date, b.check_out_date, r.price_per_night 
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.total_price IS NULL 
               OR b.total_price::text = 'NaN'
               OR b.total_price = 0;
        `;

        const { rows: corruptBookings } = await client.query(corruptQuery);

        if (corruptBookings.length === 0) {
            console.log('✅ No corrupt bookings found.');
            return;
        }

        console.log(`🛠️ Found ${corruptBookings.length} bookings to fix.`);

        for (const booking of corruptBookings) {
            const checkIn = new Date(booking.check_in_date);
            const checkOut = new Date(booking.check_out_date);
            const pricePerNight = parseFloat(booking.price_per_night);

            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            const totalPrice = nights * pricePerNight;

            if (isNaN(totalPrice)) {
                console.warn(`⚠️ Skipped booking #${booking.id}: Calculation resulted in NaN.`);
                continue;
            }

            await client.query(
                'UPDATE bookings SET total_price = $1 WHERE id = $2',
                [totalPrice, booking.id]
            );
            console.log(`✅ Fixed booking #${booking.id}: ${nights} nights × $${pricePerNight} = $${totalPrice}`);
        }

        console.log('🎉 Database repair complete.');
    } catch (err) {
        console.error('❌ Error fixing prices:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPrices();
