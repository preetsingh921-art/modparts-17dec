const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6r8eMhTIEVim@ep-steep-glade-a1s92102-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function runMigration() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const sqlPath = path.join(__dirname, 'query_logs.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
