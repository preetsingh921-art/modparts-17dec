const { Client } = require('pg');
const path = require('path');

// Load env vars
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function getStats() {
    const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6r8eMhTIEVim@ep-steep-glade-a1s92102-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('--- Database Statistics ---');

        // 1. Products Count
        const { rows: products } = await client.query('SELECT COUNT(*) FROM products');
        const productCount = products[0].count;
        console.log(`Products: ${productCount}`);

        // 2. Users Count (Total)
        const { rows: users } = await client.query('SELECT COUNT(*) FROM users');
        const userCount = users[0].count;
        console.log(`Total Users: ${userCount}`);

        // 3. Admins Count
        const { rows: admins } = await client.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        const adminCount = admins[0].count;
        console.log(`Admins: ${adminCount}`);

        // 4. Orders Count
        const { rows: orders } = await client.query('SELECT COUNT(*) FROM orders');
        const orderCount = orders[0].count;
        console.log(`Orders: ${orderCount}`);

        console.log('\n--- SQL Queries Used ---');
        console.log(`Products: SELECT COUNT(*) FROM products;`);
        console.log(`Users:    SELECT COUNT(*) FROM users;`);
        console.log(`Admins:   SELECT COUNT(*) FROM users WHERE role = 'admin';`);
        console.log(`Orders:   SELECT COUNT(*) FROM orders;`);

    } catch (err) {
        console.error('Error fetching stats:', err);
    } finally {
        await client.end();
    }
}

getStats();
