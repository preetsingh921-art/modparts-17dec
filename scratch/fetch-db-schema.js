const db = require('../lib/db');
(async () => {
  try {
    const res = await db.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    const tables = {};
    res.rows.forEach(row => {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default
      });
    });
    
    console.log(JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await db.pool.end();
  }
})();
