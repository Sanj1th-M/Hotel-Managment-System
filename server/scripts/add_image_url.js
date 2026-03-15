/**
 * Script to add image_url using postgres superuser
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'hotel_management',
    user: 'postgres',
    // We assume postgres has peer or pgpass access. If it needs a password, it'll fail.
});

const migrate = async () => {
    try {
        await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);');
        console.log('✅ Added image_url column to rooms');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
};

migrate().catch(() => process.exit(1));
