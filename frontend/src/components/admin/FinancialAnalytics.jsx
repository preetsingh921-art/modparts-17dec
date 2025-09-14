// Financial Analytics Dashboard Component
// Comprehensive financial reporting and analytics interface

import { useState, useEffect } from 'react';
import { 
  getFinancialOverview, 
  getRevenueAnalytics, 
  getOrderAnalytics,
  getProductAnalytics,
  getCustomerAnalytics,
  exportFinancialData,
  downloadCSV,
  formatCurrency,
  formatPercentage,
  formatNumber,
  getDateRangeOptions
} from '../../api/analytics';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const FinancialAnalytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState(30);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: '',
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  const { success, error: showError } = useToast();

  const dateRangeOptions = getDateRangeOptions();

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [period, activeTab, customDateRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      let analyticsData = {};

      // Determine date parameters
      const dateParams = customDateRange.enabled && customDateRange.startDate && customDateRange.endDate
        ? { startDate: customDateRange.startDate, endDate: customDateRange.endDate }
        : { period };

      switch (activeTab) {
        case 'overview':
          analyticsData = await getFinancialOverview(dateParams.period, dateParams.startDate, dateParams.endDate);
          break;
        case 'revenue':
          analyticsData = await getRevenueAnalytics(dateParams.period, dateParams.startDate, dateParams.endDate);
          break;
        case 'orders':
          analyticsData = await getOrderAnalytics(dateParams.period, dateParams.startDate, dateParams.endDate);
          break;
        case 'products':
          analyticsData = await getProductAnalytics(dateParams.period, dateParams.startDate, dateParams.endDate);
          break;
        case 'customers':
          analyticsData = await getCustomerAnalytics(dateParams.period, dateParams.startDate, dateParams.endDate);
          break;
        default:
          analyticsData = await getFinancialOverview(dateParams.period, dateParams.startDate, dateParams.endDate);
      }

      setData(analyticsData);
    } catch (err) {
      setError(err.message);
      showError('Failed to load analytics data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export data to CSV
  const handleExport = async () => {
    try {
      let exportData;
      let filename;

      if (customDateRange.enabled && customDateRange.startDate && customDateRange.endDate) {
        // Export with custom date range
        exportData = await exportFinancialData(null, 'csv', customDateRange.startDate, customDateRange.endDate);
        filename = `financial_report_${customDateRange.startDate}_to_${customDateRange.endDate}.csv`;
      } else {
        // Export with period
        exportData = await exportFinancialData(period, 'csv');
        filename = `financial_report_${period}days_${new Date().toISOString().split('T')[0]}.csv`;
      }

      downloadCSV(exportData, filename);
      success('Financial report exported successfully');
    } catch (err) {
      showError('Failed to export data: ' + err.message);
    }
  };

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'revenue', label: 'Revenue', icon: '💰' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'products', label: 'Products', icon: '🛍️' },
    { id: 'customers', label: 'Customers', icon: '👥' }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="xl" text="Loading financial analytics..." variant="gear" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-100 font-semibold mb-2">Analytics Error</h3>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={loadAnalyticsData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Financial Analytics</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="customDateRange"
              checked={customDateRange.enabled}
              onChange={(e) => setCustomDateRange(prev => ({
                ...prev,
                enabled: e.target.checked,
                startDate: e.target.checked ? prev.startDate : '',
                endDate: e.target.checked ? prev.endDate : ''
              }))}
              className="rounded border-midnight-600 bg-midnight-800 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="customDateRange" className="text-white text-sm">
              Custom Date Range
            </label>
          </div>

          {/* Period Selector (only show when custom range is disabled) */}
          {!customDateRange.enabled && (
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="bg-midnight-800 border border-midnight-600 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {/* Custom Date Range Inputs */}
          {customDateRange.enabled && (
            <>
              <div className="flex items-center space-x-2">
                <label className="text-white text-sm">From:</label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-midnight-800 border border-midnight-600 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-white text-sm">To:</label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-midnight-800 border border-midnight-600 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={customDateRange.enabled && (!customDateRange.startDate || !customDateRange.endDate)}
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-midnight-700">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'revenue' && <RevenueTab data={data} />}
        {activeTab === 'orders' && <OrdersTab data={data} />}
        {activeTab === 'products' && <ProductsTab data={data} />}
        {activeTab === 'customers' && <CustomersTab data={data} />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ data }) => {
  if (!data.revenue) return <div className="text-gray-400">No overview data available</div>;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.revenue.total)}
          icon="💰"
          color="green"
        />
        <MetricCard
          title="Completed Revenue"
          value={formatCurrency(data.revenue.completed)}
          icon="✅"
          color="blue"
        />
        <MetricCard
          title="Pending Revenue"
          value={formatCurrency(data.revenue.pending)}
          icon="⏳"
          color="yellow"
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(data.revenue.averageOrderValue)}
          icon="📊"
          color="emerald"
        />
      </div>

      {/* Order Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Orders"
          value={formatNumber(data.orders.total)}
          icon="📦"
          color="indigo"
        />
        <MetricCard
          title="Completed Orders"
          value={formatNumber(data.orders.completed)}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Pending Orders"
          value={formatNumber(data.orders.pending)}
          icon="⏳"
          color="orange"
        />
      </div>

      {/* Revenue by Payment Method */}
      {data.trends?.revenueByPaymentMethod && (
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Payment Method</h3>
          <div className="space-y-3">
            {Object.entries(data.trends.revenueByPaymentMethod).map(([method, amount]) => (
              <div key={method} className="flex justify-between items-center">
                <span className="text-gray-300 capitalize">{method.replace('_', ' ')}</span>
                <span className="text-white font-semibold">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Revenue Tab Component
const RevenueTab = ({ data }) => {
  if (!data.monthlyRevenue) return <div className="text-gray-400">No revenue data available</div>;

  return (
    <div className="space-y-6">
      {/* Monthly Revenue Chart */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue Breakdown</h3>
        <div className="space-y-4">
          {Object.entries(data.monthlyRevenue).map(([month, metrics]) => (
            <div key={month} className="border-b border-midnight-700 pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 font-medium">{month}</span>
                <span className="text-white font-semibold">{formatCurrency(metrics.total)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Completed: </span>
                  <span className="text-green-400">{formatCurrency(metrics.completed)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Pending: </span>
                  <span className="text-yellow-400">{formatCurrency(metrics.pending)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Orders: </span>
                  <span className="text-blue-400">{metrics.orders}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Growth */}
      {data.revenueGrowth && data.revenueGrowth.length > 0 && (
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Growth</h3>
          <div className="space-y-3">
            {data.revenueGrowth.map(({ month, growth }) => (
              <div key={month} className="flex justify-between items-center">
                <span className="text-gray-300">{month}</span>
                <span className={`font-semibold ${
                  parseFloat(growth) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {parseFloat(growth) >= 0 ? '+' : ''}{growth}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Orders Tab Component
const OrdersTab = ({ data }) => {
  if (!data.statusDistribution) return <div className="text-gray-400">No order data available</div>;

  return (
    <div className="space-y-6">
      {/* Order Status Distribution */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Order Status Distribution</h3>
        <div className="space-y-4">
          {Object.entries(data.statusDistribution).map(([status, metrics]) => (
            <div key={status} className="border-b border-midnight-700 pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300 capitalize font-medium">{status.replace('_', ' ')}</span>
                <div className="text-right">
                  <div className="text-white font-semibold">{metrics.count} orders</div>
                  <div className="text-gray-400 text-sm">{formatCurrency(metrics.revenue)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fulfillment Metrics */}
      {data.fulfillmentMetrics && (
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fulfillment Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Avg Fulfillment Time"
              value={`${data.fulfillmentMetrics.averageFulfillmentTime} days`}
              icon="⏱️"
              color="blue"
            />
            <MetricCard
              title="Fulfilled Orders"
              value={formatNumber(data.fulfillmentMetrics.totalFulfilledOrders)}
              icon="✅"
              color="green"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Products Tab Component
const ProductsTab = ({ data }) => {
  console.log('ProductsTab data:', data);

  if (!data) {
    return <div className="text-gray-400">Loading product data...</div>;
  }

  if (!data.topProducts) {
    return (
      <div className="space-y-4">
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Product Analytics</h3>
          <div className="text-gray-400 text-center py-8">
            <p>No product sales data available for the selected period.</p>
            <p className="text-sm mt-2">This could mean:</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• No orders have been placed yet</li>
              <li>• No order items exist in the database</li>
              <li>• The selected date range has no sales</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (data.topProducts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Selling Products</h3>
          <div className="text-gray-400 text-center py-8">
            <p>No products sold in the selected time period.</p>
            <p className="text-sm mt-2">Try selecting a longer date range or check if orders contain product items.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Products */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Selling Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-midnight-700">
                <th className="text-left py-2 text-gray-300">Product</th>
                <th className="text-left py-2 text-gray-300">Category</th>
                <th className="text-right py-2 text-gray-300">Quantity Sold</th>
                <th className="text-right py-2 text-gray-300">Revenue</th>
                <th className="text-right py-2 text-gray-300">Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product, index) => (
                <tr key={product.id} className="border-b border-midnight-800">
                  <td className="py-3 text-white">
                    <div className="flex items-center">
                      <span className="bg-midnight-700 text-midnight-200 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">
                        {index + 1}
                      </span>
                      {product.name}
                    </div>
                  </td>
                  <td className="py-3 text-gray-300">{product.category}</td>
                  <td className="py-3 text-right text-white">{formatNumber(product.totalQuantity)}</td>
                  <td className="py-3 text-right text-white">{formatCurrency(product.totalRevenue)}</td>
                  <td className="py-3 text-right text-white">{formatNumber(product.orderCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Customers Tab Component
const CustomersTab = ({ data }) => {
  if (!data.topCustomers) return <div className="text-gray-400">No customer data available</div>;

  return (
    <div className="space-y-6">
      {/* Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Customers"
          value={formatNumber(data.metrics.totalCustomers)}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Avg Customer Value"
          value={formatCurrency(data.metrics.averageCustomerValue)}
          icon="💎"
          color="emerald"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.metrics.totalRevenue)}
          icon="💰"
          color="green"
        />
      </div>

      {/* Top Customers */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Customers by Spending</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-midnight-700">
                <th className="text-left py-2 text-gray-300">Customer</th>
                <th className="text-right py-2 text-gray-300">Orders</th>
                <th className="text-right py-2 text-gray-300">Total Spent</th>
                <th className="text-right py-2 text-gray-300">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.map((customer, index) => (
                <tr key={customer.id} className="border-b border-midnight-800">
                  <td className="py-3 text-white">
                    <div className="flex items-center">
                      <span className="bg-midnight-700 text-midnight-200 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <div>{customer.name || 'Unknown'}</div>
                        <div className="text-gray-400 text-sm">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right text-white">{formatNumber(customer.orderCount)}</td>
                  <td className="py-3 text-right text-white">{formatCurrency(customer.totalSpent)}</td>
                  <td className="py-3 text-right text-gray-300">
                    {new Date(customer.lastOrder).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Reusable Metric Card Component
const MetricCard = ({ title, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    purple: 'bg-emerald-600',
    red: 'bg-red-600',
    indigo: 'bg-indigo-600',
    orange: 'bg-orange-600'
  };

  return (
    <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]} text-white mr-4`}>
          <span className="text-xl">{icon}</span>
        </div>
        <div>
          <p className="text-gray-300 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalytics;
