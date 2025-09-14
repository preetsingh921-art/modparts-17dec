import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { fetchOrderById } from '../api/myOrders';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Utility function to format date as DD-MMM-YYYY
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

// Utility function to format date with time as DD-MMM-YYYY HH:MM AM/PM
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
};

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if we should automatically print (for invoice generation)
  const location = useLocation();
  const shouldPrint = new URLSearchParams(location.search).get('print') === 'true';

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        console.log('Fetching order details for ID:', id);
        const data = await fetchOrderById(id);
        console.log('Successfully fetched order:', data);
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // Auto-print effect for invoice generation
  useEffect(() => {
    if (shouldPrint && order && !loading) {
      // Add a small delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [shouldPrint, order, loading]);

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="xl" text="Loading order details..." variant="gear" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/orders" className="text-blue-600 hover:underline">
          Back to My Orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">Order not found</p>
        <Link to="/orders" className="text-blue-600 hover:underline">
          Back to My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 single-page">
      <div className="mb-6 back-button">
        <Link to="/orders" className="text-blue-600 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to My Orders
        </Link>
      </div>

      {/* Invoice header - only visible when printing */}
      <div className="invoice-header hidden print:block">
        <h1>INVOICE</h1>
        <p>Yamaha RD Parts Shop</p>
        <p>Invoice #: {order.id}</p>
        <p>Date: {formatDate(order.created_at || Date.now())}</p>
      </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Order #{order.id || 'N/A'}</h1>
            <p className="text-gray-600">Placed on {formatDateTime(order.created_at || Date.now())}</p>
          </div>
          <div className="mt-2 md:mt-0">
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status && typeof order.status === 'string' ? order.status : 'pending')}`}>
              {(() => {
                // Safely capitalize the first letter with defensive checks
                if (order.status && typeof order.status === 'string' && order.status.length > 0) {
                  return order.status.charAt(0).toUpperCase() + order.status.slice(1);
                }
                return 'Pending';
              })()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 order-details-grid no-break">
          <div>
            <h2 className="text-lg font-semibold mb-3">Shipping Information</h2>
            <p className="text-gray-700">{order.shipping_address || 'No shipping address provided'}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Payment Information</h2>
            <p className="text-gray-700">Method: {order.payment_method ? order.payment_method.replace('_', ' ') : 'Not specified'}</p>
            <p className="text-gray-700">Total: ${parseFloat(order.total_amount || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 order-details-grid no-break">
          <div>
            <h2 className="text-lg font-semibold mb-3">Billing Information</h2>
            {order.billing_info ? (
              <div className="space-y-1">
                <p className="text-gray-700">{order.billing_info.name}</p>
                <p className="text-gray-700">{order.billing_info.email}</p>
                {order.billing_info.phone && <p className="text-gray-700">{order.billing_info.phone}</p>}
                {order.billing_info.address && (
                  <div>
                    <p className="text-gray-700">{order.billing_info.address}</p>
                    <p className="text-gray-700">
                      {[
                        order.billing_info.city,
                        order.billing_info.state,
                        order.billing_info.zip_code
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-700">No billing information available</p>
            )}
          </div>

          <div className="flex justify-end items-start no-print">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 inline-flex items-center text-sm font-medium"
              style={{ width: 'auto', minWidth: 'auto' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Print Invoice
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-3">Order Items</h2>
        <div className="border rounded overflow-hidden no-break">
          <table className="w-full order-items">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-center p-3">Price</th>
                <th className="text-center p-3">Quantity</th>
                <th className="text-right p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">{item.product_name || 'Unknown Product'}</td>
                    <td className="p-3 text-center">${parseFloat(item.price || 0).toFixed(2)}</td>
                    <td className="p-3 text-center">{item.quantity || 1}</td>
                    <td className="p-3 text-right">${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t">
                  <td colSpan="4" className="p-3 text-center text-gray-500">No items found for this order</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr className="border-t">
                <td colSpan="3" className="p-3 text-right font-semibold">Total:</td>
                <td className="p-3 text-right font-bold">${parseFloat(order.total_amount || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 order-timeline">
        <h2 className="text-lg font-semibold mb-3">Order Timeline</h2>
        <div className="space-y-4">
          {/* Always show Order Placed status */}
          <div className="flex">
            <div className="mr-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <p className="font-semibold">Order Placed</p>
              <p className="text-sm text-gray-600">{formatDateTime(order.created_at || Date.now())}</p>
            </div>
          </div>

          {/* Render status history from the API */}
          {order.status_history && order.status_history.length > 0 &&
            order.status_history
              .filter(item => item.status !== 'pending') // Skip 'pending' as it's shown as "Order Placed"
              .map((statusItem, index) => {
                // Determine icon and color based on status
                let iconColor = 'bg-blue-500';
                let icon = (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                );

                if (statusItem.status === 'processing') {
                  iconColor = 'bg-blue-500';
                } else if (statusItem.status === 'shipped') {
                  iconColor = 'bg-purple-500';
                  icon = (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h2a1 1 0 00.9-.5l3-5A1 1 0 0016 3H4a1 1 0 00-1 1z" />
                    </svg>
                  );
                } else if (statusItem.status === 'delivered') {
                  iconColor = 'bg-green-500';
                  icon = (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                    </svg>
                  );
                } else if (statusItem.status === 'cancelled') {
                  iconColor = 'bg-red-500';
                  icon = (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  );
                }

                // Format status text
                const statusText = statusItem.status.charAt(0).toUpperCase() + statusItem.status.slice(1);

                return (
                  <div className="flex" key={`status-${index}`}>
                    <div className="mr-4">
                      <div className={`w-8 h-8 ${iconColor} rounded-full flex items-center justify-center text-white`}>
                        {icon}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">{statusText}</p>
                      <p className="text-sm text-gray-600">{formatDateTime(statusItem.timestamp)}</p>
                    </div>
                  </div>
                );
              })
          }

          {/* If no status history is available, fall back to the old method */}
          {(!order.status_history || order.status_history.length <= 1) && (
            <>
              {order.status && order.status !== 'pending' && (
                <div className="flex">
                  <div className="mr-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Processing</p>
                    <p className="text-sm text-gray-600">{formatDateTime(order.updated_at || order.created_at)}</p>
                  </div>
                </div>
              )}

              {order.status && (order.status === 'shipped' || order.status === 'delivered') && (
                <div className="flex">
                  <div className="mr-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-5h2a1 1 0 00.9-.5l3-5A1 1 0 0016 3H4a1 1 0 00-1 1z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Shipped</p>
                    <p className="text-sm text-gray-600">{formatDateTime(order.updated_at || order.created_at)}</p>
                  </div>
                </div>
              )}

              {order.status && order.status === 'delivered' && (
                <div className="flex">
                  <div className="mr-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Delivered</p>
                    <p className="text-sm text-gray-600">{formatDateTime(order.updated_at || order.created_at)}</p>
                  </div>
                </div>
              )}

              {order.status && order.status === 'cancelled' && (
                <div className="flex">
                  <div className="mr-4">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Cancelled</p>
                    <p className="text-sm text-gray-600">{formatDateTime(order.updated_at || order.created_at)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Invoice footer - only visible when printing */}
      <div className="invoice-footer hidden print:block no-break">
        <p>Thank you for your business!</p>
        <p>For questions: support@yamahaparts.com | Generated: {formatDate(new Date())}</p>
      </div>
    </div>
  );
};

export default OrderDetail;
