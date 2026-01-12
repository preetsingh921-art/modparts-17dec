import { useState, useEffect } from 'react';
import api from '../../api/config';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const QueryLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        total_queries: 0,
        total_errors: 0,
        avg_duration: 0,
        last_hour: 0,
        last_24h: 0
    });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        model: 'all',
        time_range: '24h',
        search: ''
    });
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearRange, setClearRange] = useState('7d');
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams(filters);
            const { data } = await api.get(`/query-logs?${params.toString()}`);
            setLogs(data.logs || []);
            setStats(data.stats || {
                total_queries: 0,
                total_errors: 0,
                avg_duration: 0,
                last_hour: 0,
                last_24h: 0
            });
        } catch (err) {
            console.error('Failed to fetch logs:', err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Auto refresh every 30s
        return () => clearInterval(interval);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearLogs = async () => {
        setIsDeleting(true);
        try {
            await api.delete('/query-logs', { data: { range: clearRange } });
            setShowClearModal(false);
            fetchLogs();
        } catch (err) {
            console.error('Failed to clear logs:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDuration = (ms) => {
        if (ms < 1) return '<1ms';
        return `${ms}ms`;
    };

    const toggleLogExpand = (logId) => {
        setExpandedLogId(expandedLogId === logId ? null : logId);
    };

    // Parse JSON safely
    const parseJSON = (str) => {
        if (!str) return null;
        try {
            if (typeof str === 'object') return str;
            return JSON.parse(str);
        } catch {
            return str;
        }
    };

    // Format JSON for display
    const formatJSON = (data) => {
        if (!data) return 'null';
        try {
            if (typeof data === 'string') {
                const parsed = JSON.parse(data);
                return JSON.stringify(parsed, null, 2);
            }
            return JSON.stringify(data, null, 2);
        } catch {
            return String(data);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#F5F0E1]" style={{ fontFamily: "'Oswald', sans-serif" }}>Query Logs</h1>
                    <p className="text-[#A8A090] text-sm mt-1">Monitor API performance and debug issues • Click a row to see details</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={fetchLogs}
                        className="px-4 py-2 bg-[#2a2a2a] text-[#F5F0E1] rounded hover:bg-[#3a3a3a] border border-[#444] transition-colors flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowClearModal(true)}
                        className="px-4 py-2 bg-red-900/40 text-red-200 rounded hover:bg-red-900/60 border border-red-800 transition-colors flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Logs
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Queries"
                    value={(stats.total_queries || 0).toLocaleString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}
                />
                <StatCard
                    label="Errors"
                    value={stats.total_errors || 0}
                    subtext={`${((stats.total_errors / stats.total_queries) * 100 || 0).toFixed(2)}% rate`}
                    color="text-red-400"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                    label="Last 24h"
                    value={(stats.last_24h || 0).toLocaleString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                    label="Avg Duration"
                    value={`${stats.avg_duration || 0}ms`}
                    color={(stats.avg_duration || 0) > 500 ? 'text-yellow-400' : 'text-green-400'}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                />
            </div>

            {/* Filters */}
            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333] flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#A8A090]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-3 py-1.5 focus:outline-none focus:border-[#8B2332]"
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success (2xx)</option>
                        <option value="error">Error (4xx/5xx)</option>
                    </select>
                </div>

                <select
                    value={filters.model}
                    onChange={(e) => handleFilterChange('model', e.target.value)}
                    className="bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-3 py-1.5 focus:outline-none focus:border-[#8B2332]"
                >
                    <option value="all">All Models</option>
                    <option value="User">User</option>
                    <option value="Product">Product</option>
                    <option value="Order">Order</option>
                    <option value="Auth">Auth</option>
                </select>

                <select
                    value={filters.time_range}
                    onChange={(e) => handleFilterChange('time_range', e.target.value)}
                    className="bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-3 py-1.5 focus:outline-none focus:border-[#8B2332]"
                >
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>

                <div className="flex-grow">
                    <input
                        type="text"
                        placeholder="Search query or error..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-3 py-1.5 focus:outline-none focus:border-[#8B2332]"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <LoadingSpinner size="lg" text="Loading logs..." variant="gear" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#333] bg-[#222] text-[#A8A090] text-sm uppercase tracking-wider">
                                    <th className="p-4 font-medium w-8"></th>
                                    <th className="p-4 font-medium">Timestamp</th>
                                    <th className="p-4 font-medium">Model</th>
                                    <th className="p-4 font-medium">Action</th>
                                    <th className="p-4 font-medium">Query</th>
                                    <th className="p-4 font-medium text-right">Duration</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length > 0 ? (
                                    logs.map((log) => (
                                        <>
                                            {/* Main Row */}
                                            <tr
                                                key={log.id}
                                                className={`border-b border-[#333] hover:bg-[#242424] transition-colors cursor-pointer ${expandedLogId === log.id ? 'bg-[#242424]' : ''}`}
                                                onClick={() => toggleLogExpand(log.id)}
                                            >
                                                <td className="p-4 text-center">
                                                    <span className={`text-[#888] transition-transform inline-block ${expandedLogId === log.id ? 'rotate-90' : ''}`}>
                                                        ▶
                                                    </span>
                                                </td>
                                                <td className="p-4 text-[#F5F0E1] text-sm whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-[#333] rounded text-xs text-[#ccc] border border-[#444]">
                                                        {log.model}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-[#bdc3c7] text-sm font-mono">
                                                    {log.action}
                                                </td>
                                                <td className="p-4 text-[#bdc3c7] text-sm font-mono max-w-xs truncate" title={log.query}>
                                                    {log.query}
                                                    {log.error && <span className="block text-red-400 text-xs mt-1 truncate">{log.error}</span>}
                                                </td>
                                                <td className="p-4 text-right text-[#F5F0E1] text-sm font-mono">
                                                    {formatDuration(log.duration)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {(log.status >= 400 || log.error) ? (
                                                        <span className="text-red-400 font-bold text-lg" title={`Error ${log.status}`}>×</span>
                                                    ) : (
                                                        <span className="text-green-400 font-bold text-lg">✓</span>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded Details Row */}
                                            {expandedLogId === log.id && (
                                                <tr key={`${log.id}-details`} className="bg-[#0d1117] border-b border-[#333]">
                                                    <td colSpan="7" className="p-0">
                                                        <div className="p-6 space-y-4">
                                                            {/* Request Params Section */}
                                                            <div>
                                                                <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center">
                                                                    <span className="mr-2">📤</span> API Request Parameters
                                                                </h4>
                                                                <pre className="bg-[#161b22] text-[#c9d1d9] p-4 rounded-lg text-xs overflow-x-auto font-mono border border-[#30363d]">
                                                                    {log.params ? formatJSON(log.params) : log.query || 'No parameters recorded'}
                                                                </pre>
                                                            </div>

                                                            {/* Response/Result Section */}
                                                            {log.response && (
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-green-400 mb-2 flex items-center">
                                                                        <span className="mr-2">📥</span> Response
                                                                    </h4>
                                                                    <pre className="bg-[#161b22] text-[#c9d1d9] p-4 rounded-lg text-xs overflow-x-auto font-mono border border-[#30363d] max-h-60 overflow-y-auto">
                                                                        {formatJSON(log.response)}
                                                                    </pre>
                                                                </div>
                                                            )}

                                                            {/* Error Section */}
                                                            {(log.error || log.error_details || log.status >= 400) && (
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center">
                                                                        <span className="mr-2">⚠️</span> Error Details
                                                                    </h4>
                                                                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                                                                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                                                            <div>
                                                                                <span className="text-red-300">Status Code:</span>
                                                                                <span className="ml-2 text-white font-mono">{log.status || 'N/A'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-red-300">Error Type:</span>
                                                                                <span className="ml-2 text-white font-mono">{log.error_type || 'Unknown'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <pre className="bg-[#1a0a0a] text-red-300 p-4 rounded text-xs overflow-x-auto font-mono border border-red-900 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                                            {log.error_details
                                                                                ? formatJSON(log.error_details)
                                                                                : log.error || 'No error details available'}
                                                                        </pre>
                                                                        {log.stack_trace && (
                                                                            <details className="mt-3">
                                                                                <summary className="cursor-pointer text-red-400 text-sm hover:text-red-300">
                                                                                    View Stack Trace
                                                                                </summary>
                                                                                <pre className="mt-2 bg-[#1a0a0a] text-red-300/70 p-3 rounded text-xs overflow-x-auto font-mono max-h-40 overflow-y-auto">
                                                                                    {log.stack_trace}
                                                                                </pre>
                                                                            </details>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Metadata Section */}
                                                            <div className="flex flex-wrap gap-4 text-xs text-[#888] pt-2 border-t border-[#333]">
                                                                <span><strong>Log ID:</strong> {log.id}</span>
                                                                <span><strong>User ID:</strong> {log.user_id || 'Anonymous'}</span>
                                                                <span><strong>IP:</strong> {log.ip_address || 'N/A'}</span>
                                                                <span><strong>User Agent:</strong> {log.user_agent ? log.user_agent.substring(0, 50) + '...' : 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-[#666]">
                                            No logs found matching criteria
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Clear Logs Modal */}
            {showClearModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-red-900/40 rounded-lg text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#F5F0E1]">Clear Query Logs</h3>
                                <p className="text-[#A8A090] text-sm">Select time range to delete</p>
                            </div>
                        </div>

                        <p className="text-[#A8A090] mb-6 text-sm">
                            Choose the time period of logs you want to delete. This action cannot be undone.
                        </p>

                        <div className="space-y-3 mb-6">
                            {['1h', '24h', '7d', 'all'].map((range) => (
                                <label
                                    key={range}
                                    className={`flex items-center p-3 rounded border cursor-pointer transition-all ${clearRange === range
                                        ? 'border-red-500 bg-red-900/10'
                                        : 'border-[#444] hover:border-[#666]'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="range"
                                        value={range}
                                        checked={clearRange === range}
                                        onChange={(e) => setClearRange(e.target.value)}
                                        className="mr-3 accent-red-500"
                                    />
                                    <span className="text-[#F5F0E1]">
                                        {range === '1h' && 'Last hour'}
                                        {range === '24h' && 'Last 24 hours'}
                                        {range === '7d' && 'Last 7 days'}
                                        {range === 'all' && 'All time'}
                                    </span>
                                    {range === 'all' && <span className="ml-2 text-red-400 text-xs uppercase font-bold tracking-wider">Deletes everything</span>}
                                </label>
                            ))}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowClearModal(false)}
                                className="px-4 py-2 bg-[#2a2a2a] text-[#F5F0E1] rounded hover:bg-[#3a3a3a] border border-[#444] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearLogs}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center"
                            >
                                {isDeleting && <LoadingSpinner size="sm" showText={false} className="mr-2 text-white" />}
                                Delete Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, subtext, icon, color = 'text-[#F5F0E1]' }) => (
    <div className="bg-[#1a1a1a] p-5 rounded-lg border border-[#333] shadow-sm">
        <div className="flex justify-between items-start mb-2">
            <div className={`text-2xl font-bold ${color}`} style={{ fontFamily: "'Oswald', sans-serif" }}>
                {value}
            </div>
            <div className="text-[#A8A090] opacity-50">
                {icon}
            </div>
        </div>
        <div className="text-[#A8A090] text-sm font-medium">{label}</div>
        {subtext && <div className="text-xs text-[#666] mt-1">{subtext}</div>}
    </div>
);

export default QueryLogs;
