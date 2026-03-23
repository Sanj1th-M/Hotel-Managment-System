/**
 * Script to add image_url column to rooms table
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
