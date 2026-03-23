/**
 * Seed script — inserts default admin/staff users and sample rooms if they do not exist.
 * Run with: node scripts/seed.js
 *
 * Passwords are hashed with bcrypt before INSERT (no Mongoose pre-save hooks here).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SALT_ROUNDS = 12;

const seedData = async () => {
    const client = await pool.connect();
    try {
        console.log('🌱 Starting seed...\n');

        // ── Admin User ────────────────────────────────────────────────────────
        const adminEmail = process.env.SEED_ADMIN_EMAIL;
        const adminPassword = process.env.SEED_ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) {
            throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars are required. See .env.example.');
        }

        const existingAdmin = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [adminEmail.toLowerCase()]
        );

        if (existingAdmin.rows.length === 0) {
            const hash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
            await client.query(
                `INSERT INTO users (username, email, password_hash, role, is_active)
                 VALUES ($1, $2, $3, 'admin', TRUE)`,
                ['Admin', adminEmail.toLowerCase(), hash]
            );
            console.log('✅ Admin user created:');
            console.log(`   Email   : ${adminEmail}`);
            console.log('   Password: [set via SEED_ADMIN_PASSWORD env var]');
            console.log('   ⚠️  Change this password immediately after first login!');
        } else {
            console.log('ℹ️  Admin user already exists, skipping.');
        }

        // ── Staff User ────────────────────────────────────────────────────────
        const staffEmail = process.env.SEED_STAFF_EMAIL;
        const staffPassword = process.env.SEED_STAFF_PASSWORD;
        if (!staffEmail || !staffPassword) {
            throw new Error('SEED_STAFF_EMAIL and SEED_STAFF_PASSWORD env vars are required. See .env.example.');
        }

        const existingStaff = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [staffEmail.toLowerCase()]
        );

        if (existingStaff.rows.length === 0) {
            const hash = await bcrypt.hash(staffPassword, SALT_ROUNDS);
            await client.query(
                `INSERT INTO users (username, email, password_hash, role, is_active)
                 VALUES ($1, $2, $3, 'staff', TRUE)`,
                ['Receptionist', staffEmail.toLowerCase(), hash]
            );
            console.log('✅ Staff user created:');
            console.log(`   Email   : ${staffEmail}`);
            console.log('   Password: [set via SEED_STAFF_PASSWORD env var]');
        } else {
            console.log('ℹ️  Staff user already exists, skipping.');
        }

        // ── Sample Rooms ──────────────────────────────────────────────────────
        const roomCount = await client.query('SELECT COUNT(*) FROM rooms');
        if (parseInt(roomCount.rows[0].count, 10) === 0) {
            const rooms = [
                { room_number: 101, room_type: 'AC',     price_per_night: 80,  floor_number: 1, capacity: 2, description: 'AC room with garden view',                          status: 'available' },
                { room_number: 102, room_type: 'AC',     price_per_night: 80,  floor_number: 1, capacity: 2, description: 'AC room near pool',                                  status: 'available' },
                { room_number: 201, room_type: 'NON AC', price_per_night: 150, floor_number: 2, capacity: 3, description: 'Spacious NON AC room with city view',                 status: 'available' },
                { room_number: 202, room_type: 'NON AC', price_per_night: 150, floor_number: 2, capacity: 3, description: 'NON AC room with balcony',                            status: 'available' },
                { room_number: 301, room_type: 'VIP',    price_per_night: 280, floor_number: 3, capacity: 4, description: 'VIP suite with panoramic view and jacuzzi',            status: 'available' },
                { room_number: 302, room_type: 'VIP',    price_per_night: 300, floor_number: 3, capacity: 5, description: 'Presidential VIP suite with private dining area',      status: 'available' },
                { room_number: 103, room_type: 'AC',     price_per_night: 85,  floor_number: 1, capacity: 2, description: 'AC room with mountain view',                          status: 'maintenance' },
                { room_number: 203, room_type: 'NON AC', price_per_night: 160, floor_number: 2, capacity: 3, description: 'NON AC room with ocean view',                         status: 'available' },
            ];

            for (const room of rooms) {
                await client.query(
                    `INSERT INTO rooms (room_number, room_type, price_per_night, floor_number, capacity, description, status, image_url)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [room.room_number, room.room_type, room.price_per_night, room.floor_number, room.capacity, room.description, room.status, null]
                );
            }
            console.log(`✅ ${rooms.length} sample rooms created.`);
        } else {
            const count = parseInt(roomCount.rows[0].count, 10);
            console.log(`ℹ️  Rooms already exist (${count} found), skipping.`);
        }

        console.log('\n🏨 Seeding complete! Start the server with: npm run dev');
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
};

seedData().catch((err) => {
    console.error(err);
    process.exit(1);
});
