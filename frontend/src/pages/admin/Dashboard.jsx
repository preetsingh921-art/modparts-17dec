import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../../api/dashboard';
import { forceReload } from '../../utils/cache';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Added console log to verify component update
console.log('Dashboard component loaded - version with all links - updated with cache control');

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="xl" text="Loading dashboard data..." variant="gear" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/" className="text-blue-600 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
          <div className="flex space-x-2">
            <a
              href="/Modparts/restart.php"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restart Server
            </a>
            <button
              onClick={forceReload}
              className="flex items-center bg-midnight-600 text-midnight-50 px-4 py-2 rounded hover:bg-midnight-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Cache & Reload
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-midnight-600 text-midnight-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-white">{dashboardData.total_products}</p>
            </div>
          </div>
        </div>

        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-midnight-600 text-midnight-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-gray-300 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">{dashboardData.total_orders}</p>

              {/* Order status counts */}
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
                  <span className="text-gray-300">Pending: </span>
                  <span className="ml-1 font-semibold text-white">{dashboardData.orders_by_status.pending}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>
                  <span className="text-gray-300">Processing: </span>
                  <span className="ml-1 font-semibold text-white">{dashboardData.orders_by_status.processing}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                  <span className="text-gray-300">Shipped: </span>
                  <span className="ml-1 font-semibold text-white">{dashboardData.orders_by_status.shipped}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
                  <span className="text-gray-300">Delivered: </span>
                  <span className="ml-1 font-semibold text-white">{dashboardData.orders_by_status.delivered}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span>
                  <span className="text-gray-300">Cancelled: </span>
                  <span className="ml-1 font-semibold text-white">{dashboardData.orders_by_status.cancelled}</span>
                </div>
              </div>

              {/* Visual bar chart representation */}
              <div className="mt-3 space-y-1.5">
                {dashboardData.total_orders > 0 ? (
                  <>
                    <div className="flex items-center text-xs">
                      <div className="w-16 text-gray-300">Pending</div>
                      <div className="flex-1 h-2 bg-midnight-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${(dashboardData.orders_by_status.pending / dashboardData.total_orders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-16 text-gray-300">Processing</div>
                      <div className="flex-1 h-2 bg-midnight-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400"
                          style={{ width: `${(dashboardData.orders_by_status.processing / dashboardData.total_orders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-16 text-midnight-300">Shipped</div>
                      <div className="flex-1 h-2 bg-midnight-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${(dashboardData.orders_by_status.shipped / dashboardData.total_orders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-16 text-midnight-300">Delivered</div>
                      <div className="flex-1 h-2 bg-midnight-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400"
                          style={{ width: `${(dashboardData.orders_by_status.delivered / dashboardData.total_orders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-16 text-midnight-300">Cancelled</div>
                      <div className="flex-1 h-2 bg-midnight-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400"
                          style={{ width: `${(dashboardData.orders_by_status.cancelled / dashboardData.total_orders) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-midnight-400">No orders to display</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-midnight-600 text-midnight-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-midnight-300 text-sm">Total Customers</p>
              <p className="text-2xl font-bold text-midnight-50">{dashboardData.total_customers}</p>
            </div>
          </div>
        </div>

        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-midnight-600 text-midnight-100 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">${parseFloat(dashboardData.total_revenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-midnight-700">
            <h2 className="text-xl font-semibold text-midnight-50">Recent Orders</h2>
          </div>
          <div className="p-6">
            {dashboardData.recent_orders.length === 0 ? (
              <p className="text-midnight-400">No recent orders</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-midnight-800">
                      <th className="text-left p-2 text-white min-w-[100px]">Order #</th>
                      <th className="text-left p-2 text-white min-w-[150px]">Customer</th>
                      <th className="text-left p-2 text-white min-w-[120px]">Status</th>
                      <th className="text-right p-2 text-white min-w-[100px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_orders.map(order => (
                      <tr key={order.id} className="border-t border-midnight-700">
                        <td className="p-2">
                          <Link to={`/admin/orders/${order.id}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                            #{order.id}
                          </Link>
                        </td>
                        <td className="p-2 text-white">{order.first_name} {order.last_name}</td>
                        <td className="p-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${!order.status || typeof order.status !== 'string' ? 'bg-gray-600 text-gray-100' :
                              order.status === 'pending' ? 'bg-yellow-600 text-yellow-100' :
                                order.status === 'processing' ? 'bg-blue-600 text-blue-100' :
                                  order.status === 'shipped' ? 'bg-emerald-600 text-emerald-100' :
                                    order.status === 'delivered' ? 'bg-green-600 text-green-100' :
                                      'bg-red-600 text-red-100'
                            }`}>
                            {order.status && typeof order.status === 'string' && order.status.length > 0
                              ? (order.status.charAt(0).toUpperCase() + order.status.slice(1))
                              : 'Pending'}
                          </span>
                        </td>
                        <td className="p-2 text-right text-white">${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 text-right">
              <Link to="/admin/orders" className="text-midnight-300 hover:text-midnight-100 hover:underline">
                View All Orders
              </Link>
            </div>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-midnight-700">
            <h2 className="text-xl font-semibold text-midnight-50">Low Stock Products</h2>
          </div>
          <div className="p-6">
            {dashboardData.low_stock.length === 0 ? (
              <p className="text-midnight-400">No low stock products</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="bg-midnight-800">
                      <th className="text-left p-2 text-white min-w-[200px]">Product</th>
                      <th className="text-right p-2 text-white min-w-[80px]">Stock</th>
                      <th className="text-center p-2 text-white min-w-[120px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.low_stock.map(product => (
                      <tr key={product.id} className="border-t border-midnight-700">
                        <td className="p-2">
                          <Link to={`/admin/products/edit/${product.id}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                            {product.name}
                          </Link>
                        </td>
                        <td className="p-2 text-right">
                          <span className={`font-semibold ${product.quantity <= 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                            {product.quantity}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <Link
                            to={`/admin/products/edit/${product.id}`}
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            Update Stock
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 text-right">
              <Link to="/admin/products" className="text-midnight-300 hover:text-midnight-100 hover:underline">
                View All Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
