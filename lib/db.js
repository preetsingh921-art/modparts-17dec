const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ FATAL: DATABASE_URL is not defined in environment variables.');
    throw new Error('DATABASE_URL environment variable is required');
}

// Use a connection pool for better performance with serverless/lambda environments
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20, // max number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
});

// Helper to run queries
const query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Uncomment for debug logging
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
};

module.exports = {
    query,
    pool
};
