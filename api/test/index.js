const db = require('../../lib/db');

module.exports = async function handler(req, res) {
  console.log('🧪 Test API (Neon) called');

  try {
    // Test Neon DB connection
    console.log('Testing Neon DB connection...');

    // Simple query to check connection
    const start = Date.now();
    const { rows } = await db.query('SELECT NOW() as now, count(*) as user_count FROM users');
    const duration = Date.now() - start;

    console.log('✅ Neon DB connection successful');
    console.log(`⏱️ Query took ${duration}ms`);
    console.log('✅ Environment variables check:');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
    console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');

    res.status(200).json({
      message: 'Test successful',
      database: 'Connected (Neon)',
      stats: {
        queryDurationMs: duration,
        serverTime: rows[0].now,
        userCount: parseInt(rows[0].user_count)
      },
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Missing'
      }
    });

  } catch (error) {
    console.error('❌ Test API error:', error);
    res.status(500).json({
      message: 'Test failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
