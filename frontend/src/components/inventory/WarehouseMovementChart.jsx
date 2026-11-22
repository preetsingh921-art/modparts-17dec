import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * WarehouseMovementChart
 * Renders a time-series graph plotting Units Sent (Outbound) vs Units Received (Inbound)
 * over time, filterable by warehouse, time interval, and chart format.
 */
export default function WarehouseMovementChart({
  movements = [],
  selectedWarehouseId = 'all',
  selectedWarehouseName = 'All Warehouses'
}) {
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [interval, setInterval] = useState('day'); // 'day', 'week', 'month'

  // Process data into time-series buckets
  const { chartData, totals } = useMemo(() => {
    if (!movements || movements.length === 0) {
      return {
        chartData: { labels: [], datasets: [] },
        totals: { sent: 0, received: 0, inTransit: 0 }
      };
    }

    // Helper: format date key based on interval
    const getDateKey = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;

      if (interval === 'month') {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }
      if (interval === 'week') {
        // Find beginning of week (Monday)
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      // Default: daily (e.g. "Nov 21")
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Filter movements by warehouse
    const relevantMovements = movements.filter((m) => {
      if (selectedWarehouseId === 'all') return true;
      const wId = String(selectedWarehouseId);
      return String(m.from_warehouse_id) === wId || String(m.to_warehouse_id) === wId;
    });

    // Buckets map
    const buckets = new Map(); // key -> { sent: 0, received: 0, timestamp: number }
    let totalSent = 0;
    let totalReceived = 0;
    let totalInTransit = 0;

    relevantMovements.forEach((m) => {
      const qty = parseInt(m.quantity) || 1;
      const isSender = selectedWarehouseId === 'all' || String(m.from_warehouse_id) === String(selectedWarehouseId);
      const isReceiver = selectedWarehouseId === 'all' || String(m.to_warehouse_id) === String(selectedWarehouseId);

      // In-transit count
      if (m.status === 'in_transit') {
        totalInTransit += qty;
      }

      // Sent event
      if (isSender && (m.shipped_at || m.created_at)) {
        const dateKey = getDateKey(m.shipped_at || m.created_at);
        if (dateKey) {
          if (!buckets.has(dateKey)) {
            buckets.set(dateKey, {
              sent: 0,
              received: 0,
              ts: new Date(m.shipped_at || m.created_at).getTime()
            });
          }
          buckets.get(dateKey).sent += qty;
          totalSent += qty;
        }
      }

      // Received event (completed or arrived)
      if (isReceiver && (m.status === 'completed' || m.status === 'arrived') && (m.received_at || m.updated_at || m.created_at)) {
        const dateKey = getDateKey(m.received_at || m.updated_at || m.created_at);
        if (dateKey) {
          if (!buckets.has(dateKey)) {
            buckets.set(dateKey, {
              sent: 0,
              received: 0,
              ts: new Date(m.received_at || m.updated_at || m.created_at).getTime()
            });
          }
          buckets.get(dateKey).received += qty;
          totalReceived += qty;
        }
      }
    });

    // Sort buckets chronologically by earliest timestamp
    const sortedEntries = Array.from(buckets.entries()).sort((a, b) => a[1].ts - b[1].ts);
    const labels = sortedEntries.map(([label]) => label);
    const sentData = sortedEntries.map(([, val]) => val.sent);
    const receivedData = sortedEntries.map(([, val]) => val.received);

    const datasets = [
      {
        label: '📤 Units Sent (Dispatched)',
        data: sentData,
        borderColor: '#3B82F6', // Blue
        backgroundColor: chartType === 'line' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.8)',
        fill: chartType === 'line',
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#fff',
        pointHoverRadius: 6
      },
      {
        label: '📥 Units Received',
        data: receivedData,
        borderColor: '#10B981', // Emerald green
        backgroundColor: chartType === 'line' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.8)',
        fill: chartType === 'line',
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#fff',
        pointHoverRadius: 6
      }
    ];

    return {
      chartData: { labels, datasets },
      totals: { sent: totalSent, received: totalReceived, inTransit: totalInTransit }
    };
  }, [movements, selectedWarehouseId, interval, chartType]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#F5F0E1',
          font: { family: "'Oswald', sans-serif", size: 12 },
          boxWidth: 14,
          usePointStyle: chartType === 'line'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#F5F0E1',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(184, 134, 11, 0.5)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: function (context) {
            return ` ${context.dataset.label}: ${context.parsed.y} units`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          precision: 0
        }
      }
    }
  };

  return (
    <div className="bg-[#1c1c1c] border border-[#B8860B]/40 rounded-xl p-5 mb-6 shadow-xl">
      {/* Chart Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-[#333] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <h3 className="text-lg font-bold text-[#F5F0E1] tracking-wide uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Logistics Activity Over Time
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-midnight-800 text-amber-300 border border-amber-600/40">
              {selectedWarehouseName}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Compare total units dispatched (Sent) vs. inbound delivered (Received) over time
          </p>
        </div>

        {/* Action Controls: Day/Week/Month & Line/Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Interval Selector */}
          <div className="flex rounded-lg bg-[#242424] border border-[#444] p-0.5 text-xs">
            <button
              onClick={() => setInterval('day')}
              className={`px-2.5 py-1 rounded transition-colors ${interval === 'day' ? 'bg-[#B8860B] text-black font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setInterval('week')}
              className={`px-2.5 py-1 rounded transition-colors ${interval === 'week' ? 'bg-[#B8860B] text-black font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setInterval('month')}
              className={`px-2.5 py-1 rounded transition-colors ${interval === 'month' ? 'bg-[#B8860B] text-black font-bold' : 'text-gray-300 hover:text-white'}`}
            >
              Monthly
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="flex rounded-lg bg-[#242424] border border-[#444] p-0.5 text-xs">
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded transition-colors ${chartType === 'line' ? 'bg-blue-600 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
              title="Line Chart"
            >
              📈 Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded transition-colors ${chartType === 'bar' ? 'bg-blue-600 text-white font-bold' : 'text-gray-300 hover:text-white'}`}
              title="Bar Chart"
            >
              📊 Bar
            </button>
          </div>
        </div>
      </div>

      {/* Chart Body */}
      <div className="h-64 sm:h-72 w-full relative">
        {chartData.labels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
            <span className="text-3xl mb-2">📦</span>
            <p>No shipment or receipt activity recorded in this timeframe.</p>
            <p className="text-xs text-gray-600 mt-1">Dispatches and receipts will graph here automatically.</p>
          </div>
        ) : chartType === 'line' ? (
          <Line data={chartData} options={options} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>

      {/* Mini Footprint Summary */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#333] text-center">
        <div className="bg-[#242424] p-2.5 rounded-lg border border-blue-900/40">
          <div className="text-[11px] text-blue-400 font-medium">Total Units Sent</div>
          <div className="text-xl font-bold text-[#F5F0E1] mt-0.5">{totals.sent}</div>
        </div>
        <div className="bg-[#242424] p-2.5 rounded-lg border border-emerald-900/40">
          <div className="text-[11px] text-emerald-400 font-medium">Total Units Received</div>
          <div className="text-xl font-bold text-[#F5F0E1] mt-0.5">{totals.received}</div>
        </div>
        <div className="bg-[#242424] p-2.5 rounded-lg border border-amber-900/40">
          <div className="text-[11px] text-amber-400 font-medium">Currently In Transit</div>
          <div className="text-xl font-bold text-[#F5F0E1] mt-0.5">{totals.inTransit}</div>
        </div>
      </div>
    </div>
  );
}
