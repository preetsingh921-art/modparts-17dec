import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrderById } from '../api/orders';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const OrderConfirmation = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const data = await getOrderById(id);
        setOrder(data);
      } catch (err) {
        setError(err.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

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
          View All Orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">Order not found</p>
        <Link to="/orders" className="text-blue-600 hover:underline">
          View All Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-200 px-6 py-8 rounded-lg mb-8 text-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h1
            className="text-3xl font-bold mb-2 text-[#F5F0E1] uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Order Confirmed!
          </h1>
          <p className="text-lg text-[#D4CFC0]">Thank you for your purchase.</p>
          <p className="text-lg text-[#D4CFC0]">Your order number is: <span className="font-bold text-[#F5F0E1]">#{order.id || 'N/A'}</span></p>
        </div>

        <div className="bg-[#242424] border border-[#333] rounded-lg shadow-lg p-6 mb-6">
          <h2
            className="text-xl font-bold mb-4 text-[#F5F0E1] uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Order Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-[#D4CFC0]">
            <div>
              <h3 className="font-semibold mb-2 text-[#F5F0E1]">Order Information</h3>
              <p className="text-sm">Order Date & Time: {new Date(order.created_at || Date.now()).toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}</p>
              <p className="text-sm mt-1">Status: <span className="capitalize text-[#F5F0E1] font-medium">{order.status || 'pending'}</span></p>
              <p className="text-sm mt-1">Payment Method: <span className="text-[#F5F0E1] font-medium">{order.payment_method ? order.payment_method.replace('_', ' ') : 'Not specified'}</span></p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-[#F5F0E1]">Shipping Address</h3>
              <p className="text-sm">{order.shipping_address || 'No shipping address provided'}</p>
            </div>
          </div>

          <h3 className="font-semibold mb-3 text-[#F5F0E1]">Order Items</h3>
          <div className="border border-[#333] rounded overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-[#1a1a1a] text-[#A8A090]">
                <tr>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Product</th>
                  <th className="text-center p-3 text-xs uppercase font-semibold">Price</th>
                  <th className="text-center p-3 text-xs uppercase font-semibold">Quantity</th>
                  <th className="text-right p-3 text-xs uppercase font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {order.items && order.items.length > 0 ? (
                  order.items.map(item => (
                    <tr key={item.id} className="text-[#F5F0E1] hover:bg-[#2a2a2a] transition-colors">
                      <td className="p-3 text-sm">{item.product_name || 'Unknown Product'}</td>
                      <td className="p-3 text-center text-sm">${parseFloat(item.price || 0).toFixed(2)}</td>
                      <td className="p-3 text-center text-sm">{item.quantity || 1}</td>
                      <td className="p-3 text-right text-sm font-medium">${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-3 text-center text-[#A8A090]">No items found for this order</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[#1e1e1e] border-t border-[#333] text-[#F5F0E1]">
                <tr>
                  <td colSpan="3" className="p-3 text-right font-semibold">Total:</td>
                  <td className="p-3 text-right font-bold font-mono">${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Link
            to="/products"
            className="bg-[#8B2332] text-white px-6 py-3 rounded font-semibold hover:bg-[#A32A3B] transition-colors text-center"
          >
            Continue Shopping
          </Link>
          <Link
            to="/orders"
            className="bg-[#333] text-[#D4CFC0] px-6 py-3 rounded font-semibold hover:bg-[#3d3d3d] border border-[#444] transition-colors text-center"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
