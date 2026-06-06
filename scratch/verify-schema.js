const db = require('../lib/db');

async function verifySchema() {
  console.log('🔍 Starting database schema verification...');
  try {
    // 1. Get all tables in public schema
    const tablesRes = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`\n📋 Found ${tables.length} tables in the public schema:`);
    console.log(tables.map(t => `   - ${t}`).join('\n'));

    // 2. Inspect each table's column count and row count
    console.log('\n📊 Table statistics (columns & row counts):');
    for (const table of tables) {
      try {
        const colRes = await db.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1;
        `, [table]);
        
        const countRes = await db.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        const rowCount = countRes.rows[0].cnt;
        
        console.log(`   * ${table}: ${colRes.rows.length} columns, ${rowCount} rows`);
      } catch (err) {
        console.error(`   ❌ Error querying table ${table}:`, err.message);
      }
    }

    // 3. Inspect Foreign Key Constraints
    console.log('\n🔗 Foreign Key constraints:');
    const fkRes = await db.query(`
      SELECT
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);

    if (fkRes.rows.length === 0) {
      console.log('   (No foreign keys found)');
    } else {
      fkRes.rows.forEach(fk => {
        console.log(`   - ${fk.table_name}.${fk.column_name} ➔ ${fk.foreign_table_name}.${fk.foreign_column_name} (Constraint: ${fk.constraint_name})`);
      });
    }

    // 4. Verify unique constraints on products
    console.log('\n✅ Checking products table constraints...');
    const constraintRes = await db.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND conrelid = 'products'::regclass;
    `);
    
    constraintRes.rows.forEach(r => {
      console.log(`   - ${r.conname}: ${r.pg_get_constraintdef}`);
    });

    console.log('\n🎉 Schema verification completed successfully!');
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
  } finally {
    process.exit(0);
  }
}

verifySchema();
