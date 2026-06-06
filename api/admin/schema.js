const db = require('../../lib/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

module.exports = async (req, res) => {
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  try {
    if (req.method === 'GET') {
      console.log('🔍 Admin fetching database schema details...');

      // 1. Fetch columns
      const columnsQuery = `
        SELECT 
          table_name, 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;
      const { rows: columns } = await db.query(columnsQuery);

      // 2. Fetch Primary Keys
      const pkQuery = `
        SELECT 
          kcu.table_name,
          kcu.column_name
        FROM 
          information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE 
          tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      `;
      const { rows: pks } = await db.query(pkQuery);
      
      const pkMap = {};
      pks.forEach(pk => {
        if (!pkMap[pk.table_name]) pkMap[pk.table_name] = new Set();
        pkMap[pk.table_name].add(pk.column_name);
      });

      // 3. Fetch Foreign Keys
      const fkQuery = `
        SELECT
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
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
      `;
      const { rows: fks } = await db.query(fkQuery);

      // Structure tables
      const tables = {};
      columns.forEach(col => {
        const tableName = col.table_name;
        if (!tables[tableName]) {
          tables[tableName] = [];
        }
        
        tables[tableName].push({
          column: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          isPrimaryKey: pkMap[tableName]?.has(col.column_name) || false
        });
      });

      // 4. Fetch row counts for each table
      const rowCounts = {};
      const tableNames = Object.keys(tables);
      for (const name of tableNames) {
        try {
          // Double quote table names to prevent SQL issues with reserved words
          const countRes = await db.query(`SELECT COUNT(*) as cnt FROM "${name}"`);
          rowCounts[name] = parseInt(countRes.rows[0].cnt) || 0;
        } catch (err) {
          console.error(`Error counting table ${name}:`, err.message);
          rowCounts[name] = 0;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          tables,
          rowCounts,
          relations: fks.map(fk => ({
            table: fk.table_name,
            column: fk.column_name,
            foreignTable: fk.foreign_table_name,
            foreignColumn: fk.foreign_column_name
          }))
        }
      });
    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Admin schema API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
