import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyOrders, createTestOrder } from '../api/myOrders';
import LoadingSpinner, { InlineLoader } from '../components/ui/LoadingSpinner';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Function to load orders
  const loadOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching orders...');
      const data = await fetchMyOrders();
      console.log('Orders fetched:', data);

      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error('Invalid data format received:', data);
        setError('Received invalid data format from server.');
      }
    } catch (err) {
      console.error('Error in loadOrders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to create a test order
  const handleCreateTestOrder = async () => {
    setCreating(true);
    setError(null);

    try {
      const data = await createTestOrder();
      setOrders(data);
    } catch (err) {
      console.error('Error in handleCreateTestOrder:', err);
      setError('Failed to create test order. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Load orders on component mount
  useEffect(() => {
    loadOrders();
  }, []);

  // Function to get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600 text-yellow-100';
      case 'processing':
        return 'bg-blue-600 text-blue-100';
      case 'shipped':
        return 'bg-emerald-600 text-emerald-100';
      case 'delivered':
        return 'bg-green-600 text-green-100';
      case 'cancelled':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-slate-600 text-slate-100';
    }
  };

  // Function to format date and time
  const formatDate = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">My Orders</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="xl" text="Loading your orders..." variant="gear" />
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button
            onClick={loadOrders}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 card">
          <p className="text-xl text-gray-600 mb-6">You don't have any orders yet</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/products"
              className="bg-blue-800 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700"
            >
              Browse Products
            </Link>
            <button
              onClick={handleCreateTestOrder}
              disabled={creating}
              className={`${
                creating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              } text-white px-6 py-3 rounded font-semibold flex items-center space-x-2`}
            >
              {creating ? (
                <InlineLoader text="Creating..." variant="gear" size="sm" />
              ) : (
                'Create Test Order'
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-600">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/order/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          to="/products"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-700"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default MyOrders;
