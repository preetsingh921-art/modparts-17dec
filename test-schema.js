const db = require('./lib/db');
async function test() {
    const schemaQuery = `
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name NOT IN ('spatial_ref_sys')
        AND column_name NOT ILIKE '%password%'
        ORDER BY table_name, ordinal_position;
    `;
    const schemaRes = await db.query(schemaQuery);
    const tables = {};
    schemaRes.rows.forEach(row => {
        if (!tables[row.table_name]) tables[row.table_name] = [];
        tables[row.table_name].push(row.column_name);
    });
    console.log(Object.keys(tables).filter(t => t.includes('order')));
    process.exit(0);
}
test();
