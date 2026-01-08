const db = require('../../lib/db');

module.exports = async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const {
                status,
                model,
                time_range = '24h',
                search,
                limit = 100,
                page = 1
            } = req.query;

            // Base query
            let query = `
        SELECT * FROM query_logs 
        WHERE 1=1
      `;
            const queryParams = [];
            let paramCount = 1;

            // Filter by Status
            if (status && status !== 'all') {
                // Status maps to numeric codes or ranges 
                if (status === 'success') {
                    query += ` AND status >= 200 AND status < 300`;
                } else if (status === 'error') {
                    query += ` AND status >= 400`;
                }
            }

            // Filter by Model
            if (model && model !== 'all') {
                query += ` AND model = $${paramCount}`;
                queryParams.push(model);
                paramCount++;
            }

            // Filter by Time Range
            if (time_range !== 'all') {
                const now = new Date();
                let startTime;

                switch (time_range) {
                    case '1h':
                        startTime = new Date(now - 60 * 60 * 1000);
                        break;
                    case '24h':
                        startTime = new Date(now - 24 * 60 * 60 * 1000);
                        break;
                    case '7d':
                        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
                        break;
                    default:
                        startTime = new Date(now - 24 * 60 * 60 * 1000); // Default to 24h
                }

                query += ` AND timestamp >= $${paramCount}`;
                queryParams.push(startTime.toISOString());
                paramCount++;
            }

            // Search Filter (fuzzy search on query text)
            if (search) {
                query += ` AND query ILIKE $${paramCount}`;
                queryParams.push(`%${search}%`);
                paramCount++;
            }

            // Add Pagination and Sorting
            const limitVal = parseInt(limit) || 100;
            const offsetVal = (parseInt(page) - 1) * limitVal;

            query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            queryParams.push(limitVal, offsetVal);

            // Execute Query
            const { rows } = await db.query(query, queryParams);

            // Get Stats (Total, Errors, Today)
            // This is efficient enough for moderate data sizes. For huge data, optimize or cache.
            const statsQuery = `
        SELECT
          COUNT(*) as total_queries,
          SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as total_errors,
          AVG(duration) as avg_duration,
          COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour_count,
          COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_count
        FROM query_logs
      `;

            const statsResult = await db.query(statsQuery);
            const stats = statsResult.rows[0];

            return res.status(200).json({
                logs: rows,
                stats: {
                    total_queries: parseInt(stats.total_queries),
                    total_errors: parseInt(stats.total_errors),
                    avg_duration: Math.round(parseFloat(stats.avg_duration) || 0),
                    last_hour: parseInt(stats.last_hour_count),
                    last_24h: parseInt(stats.last_24h_count)
                }
            });

        } else if (req.method === 'DELETE') {
            // Clear logs based on range
            const { range } = req.body; // '1h', '24h', '7d', 'all'

            if (!range) {
                return res.status(400).json({ message: 'Time range is required' });
            }

            let deleteQuery = 'DELETE FROM query_logs';
            const deleteParams = [];

            if (range !== 'all') {
                const now = new Date();
                let startTime;

                switch (range) {
                    case '1h': startTime = new Date(now - 60 * 60 * 1000); break;
                    case '24h': startTime = new Date(now - 24 * 60 * 60 * 1000); break;
                    case '7d': startTime = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
                    case '30d': startTime = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
                    default: return res.status(400).json({ message: 'Invalid range' });
                }

                // Delete logs OLDER than the start time? Or matching the filter logic (last X)?
                // User request "Clear Query Logs... Select time range to delete... Last 7 days"
                // This implies deleting logs created WITHIN the last 7 days.
                deleteQuery += ` WHERE timestamp >= $1`;
                deleteParams.push(startTime.toISOString());
            }

            await db.query(deleteQuery, deleteParams);

            return res.status(200).json({ message: 'Logs deleted successfully' });

        } else {
            return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Query Logs API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
