const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6r8eMhTIEVim@ep-steep-glade-a1s92102-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Use a connection pool for better performance with serverless/lambda environments
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20, // max number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
