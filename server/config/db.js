const { Pool } = require('pg');

/**
 * PostgreSQL connection pool using DATABASE_URL from environment variables.
 * The pool manages multiple client connections efficiently.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fail fast on misconfigured credentials in development
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10, // max pool size
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL Connection Error:', err.message);
    process.exit(1);
  }
  release();
  console.log('✅ PostgreSQL Connected successfully');
});

module.exports = pool;
