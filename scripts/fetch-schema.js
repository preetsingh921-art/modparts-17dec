const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Fallback

async function fetchSchema() {
    console.log('Fetching schema from Neon DB...');

    const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6r8eMhTIEVim@ep-steep-glade-a1s92102-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

    console.log('Connecting with string length:', connectionString.length);

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        await client.connect();
        console.log('Connected to database successfully');

        const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
        const { rows: tables } = await client.query(tableQuery);

        let schemaOutput = '-- Neon Database Schema Dump\n';
        schemaOutput += `-- Generated at ${new Date().toISOString()}\n\n`;

        for (const table of tables) {
            const tableName = table.table_name;
            console.log(`Processing table: ${tableName}`);
            schemaOutput += `CREATE TABLE public.${tableName} (\n`;

            const columnQuery = `
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;
            const { rows: columns } = await client.query(columnQuery, [tableName]);

            const columnDefs = columns.map(col => {
                let type = col.data_type;
                if (col.character_maximum_length) {
                    type += `(${col.character_maximum_length})`;
                }

                // Simple formatting
                let def = `  ${col.column_name.padEnd(20)} ${type}`;

                if (col.is_nullable === 'NO') def += ' NOT NULL';
                if (col.column_default) def += ` DEFAULT ${col.column_default}`;

                return def;
            });

            schemaOutput += columnDefs.join(',\n');
            schemaOutput += '\n);\n\n';
        }

        const outputPath = path.join(__dirname, '../neon-db-schema.sql');
        fs.writeFileSync(outputPath, schemaOutput);
        console.log(`Schema fetched and saved to ${outputPath}`);
    } catch (err) {
        console.error('Error fetching schema:', err);
    } finally {
        await client.end();
    }
}

fetchSchema();
