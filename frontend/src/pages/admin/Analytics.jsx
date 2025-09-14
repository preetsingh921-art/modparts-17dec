// Financial Analytics Page
// Admin page for comprehensive financial reporting and analytics

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FinancialAnalytics from '../../components/admin/FinancialAnalytics';
import { getKPIs, formatCurrency, formatPercentage, formatNumber } from '../../api/analytics';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const Analytics = () => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { error: showError } = useToast();

  // Load KPIs on component mount
  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      const kpiData = await getKPIs(30); // Last 30 days
      setKpis(kpiData);
    } catch (err) {
      setError(err.message);
      showError('Failed to load analytics data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Financial Analytics</h1>
          <p className="text-gray-400 mt-1">Comprehensive financial reporting and business intelligence</p>
        </div>
        
        <div className="flex space-x-3">
          <Link
            to="/admin"
            className="flex items-center bg-midnight-700 text-midnight-50 px-4 py-2 rounded hover:bg-midnight-600 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Quick KPIs Summary */}
      {loading ? (
        <div className="text-center py-8">
          <LoadingSpinner size="lg" text="Loading KPIs..." variant="gear" />
        </div>
      ) : error ? (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">Failed to load KPIs: {error}</p>
          <button
            onClick={loadKPIs}
            className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue (30d)"
            value={formatCurrency(kpis.totalRevenue)}
            subtitle={`${formatNumber(kpis.totalOrders)} orders`}
            icon="💰"
            color="green"
          />
          <KPICard
            title="Avg Order Value"
            value={formatCurrency(kpis.averageOrderValue)}
            subtitle={`${formatPercentage(kpis.conversionRate)} conversion`}
            icon="📊"
            color="blue"
          />
          <KPICard
            title="Customer Value"
            value={formatCurrency(kpis.averageCustomerValue)}
            subtitle={`${formatNumber(kpis.totalCustomers)} customers`}
            icon="👥"
            color="emerald"
          />
          <KPICard
            title="Fulfillment Time"
            value={`${kpis.averageFulfillmentTime} days`}
            subtitle={`${formatNumber(kpis.completedOrders)} completed`}
            icon="⏱️"
            color="orange"
          />
        </div>
      )}

      {/* Revenue Status Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Completed Revenue</span>
                <span className="text-green-400 font-semibold">{formatCurrency(kpis.completedRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Pending Revenue</span>
                <span className="text-yellow-400 font-semibold">{formatCurrency(kpis.pendingRevenue)}</span>
              </div>
              <div className="pt-2 border-t border-midnight-700">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Revenue</span>
                  <span className="text-white font-bold text-lg">{formatCurrency(kpis.totalRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Order Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Completed Orders</span>
                <span className="text-green-400 font-semibold">{formatNumber(kpis.completedOrders)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Pending Orders</span>
                <span className="text-yellow-400 font-semibold">{formatNumber(kpis.pendingOrders)}</span>
              </div>
              <div className="pt-2 border-t border-midnight-700">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Orders</span>
                  <span className="text-white font-bold text-lg">{formatNumber(kpis.totalOrders)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Analytics Component */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
        <FinancialAnalytics />
      </div>

      {/* Analytics Features Info */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Analytics Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon="📊"
            title="Financial Overview"
            description="Complete revenue breakdown, order metrics, and payment method analysis"
          />
          <FeatureCard
            icon="📈"
            title="Revenue Analytics"
            description="Monthly revenue trends, growth analysis, and revenue forecasting"
          />
          <FeatureCard
            icon="📦"
            title="Order Analytics"
            description="Order status distribution, fulfillment metrics, and processing times"
          />
          <FeatureCard
            icon="🛍️"
            title="Product Performance"
            description="Top selling products, category analysis, and inventory insights"
          />
          <FeatureCard
            icon="👥"
            title="Customer Analytics"
            description="Customer lifetime value, purchase behavior, and retention metrics"
          />
          <FeatureCard
            icon="📤"
            title="Data Export"
            description="Export financial reports in CSV format for external analysis"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/orders"
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Manage Orders
          </Link>
          <Link
            to="/admin/products"
            className="btn-primary flex items-center px-4 py-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Manage Products
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Manage Users
          </Link>
        </div>
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-emerald-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    indigo: 'bg-indigo-600'
  };

  return (
    <div className="bg-midnight-900 border border-midnight-700 rounded-lg p-4">
      <div className="flex items-center">
        <div className={`p-2 rounded-full ${colorClasses[color]} text-white mr-3`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-xs uppercase tracking-wide">{title}</p>
          <p className="text-white font-bold text-lg">{value}</p>
          {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="text-white font-semibold mb-2">{title}</h4>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
};

export default Analytics;
