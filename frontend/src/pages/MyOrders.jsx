import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyOrders, createTestOrder } from '../api/myOrders';
import LoadingSpinner, { InlineLoader } from '../components/ui/LoadingSpinner';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

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

  // Pagination logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold mb-8 text-[#F5F0E1] uppercase tracking-wider"
        style={{ fontFamily: "'Oswald', sans-serif" }}
      >
        My Orders
      </h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="xl" text="Loading your orders..." variant="gear" />
        </div>
      ) : error ? (
        <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button
            onClick={loadOrders}
            className="mt-2 bg-[#8B2332] hover:bg-[#A32A3B] text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-[#242424] border border-[#333] rounded-lg">
          <p className="text-xl text-[#D4CFC0] mb-6">You don't have any orders yet</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/products"
              className="bg-[#8B2332] text-white px-6 py-3 rounded font-semibold hover:bg-[#A32A3B] transition-colors"
            >
              Browse Products
            </Link>
            <button
              onClick={handleCreateTestOrder}
              disabled={creating}
              className={`${
                creating ? 'bg-gray-600' : 'bg-[#2d4a2d] hover:bg-[#385c38]'
              } text-white px-6 py-3 rounded font-semibold flex items-center justify-center space-x-2 border border-[#446644] transition-colors`}
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
        <div className="bg-[#242424] border border-[#333] rounded-lg overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#333]">
              <thead className="bg-[#1a1a1a]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#A8A090] uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#A8A090] uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#A8A090] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#A8A090] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#A8A090] uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-[#A8A090] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#242424] divide-y divide-[#333]">
                {currentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#2a2a2a] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-[#F5F0E1]">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#D4CFC0]">{formatDate(order.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-[#F5F0E1]">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#D4CFC0]">
                      {order.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/order/${order.id}`}
                        className="text-[#B8860B] hover:text-[#d49b10] transition-colors"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 bg-[#1a1a1a] border-t border-[#333]">
              <span className="text-sm text-[#A8A090]">
                Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, orders.length)} of {orders.length} orders
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-[#2d2d2d] text-[#F5F0E1] rounded disabled:opacity-50 hover:bg-[#383838] border border-[#444] transition-colors"
                >
                  Previous
                </button>
                <div className="flex space-x-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 rounded font-medium border transition-colors ${
                        currentPage === i + 1
                          ? 'bg-[#8B2332] text-white border-[#8B2332]'
                          : 'bg-[#2d2d2d] text-[#D4CFC0] border-[#444] hover:bg-[#383838]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-[#2d2d2d] text-[#F5F0E1] rounded disabled:opacity-50 hover:bg-[#383838] border border-[#444] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          to="/products"
          className="inline-flex items-center px-5 py-2.5 rounded shadow-sm text-sm font-medium text-white bg-[#8B2332] hover:bg-[#A32A3B] transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default MyOrders;
