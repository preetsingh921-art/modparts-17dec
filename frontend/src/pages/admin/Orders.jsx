import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllOrders, updateOrderStatus } from '../../api/orders';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/ui/Pagination';
import ProgressBar from '../../components/ui/ProgressBar';
import { exportToPDF, exportToXLSX } from '../../utils/exportUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { emailService } from '../../services/emailService';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { success, error: showError } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Export state
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  // Selection state
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await getAllOrders();
        console.log('📋 Raw orders data from API:', data);

        // Transform the orders data to ensure customer information is properly extracted
        const transformedOrders = data.map(order => {
          const customerName = order.customer_name ||
            (order.user
              ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim()
              : `${order.first_name || ''} ${order.last_name || ''}`.trim()) || 'Unknown Customer';

          const customerEmail = order.customer_email || order.user?.email || order.email || 'No email provided';

          console.log(`📋 Order ${order.id} customer info:`, {
            original: { customer_name: order.customer_name, customer_email: order.customer_email, user: order.user },
            transformed: { customer_name: customerName, email: customerEmail }
          });

          return {
            ...order,
            customer_name: customerName,
            email: customerEmail
          };
        });

        console.log('📋 Transformed orders:', transformedOrders);
        setOrders(transformedOrders);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Find the order data for email before updating
      const orderData = orders.find(order => order.id === orderId);

      // Update order status in database
      await updateOrderStatus(orderId, newStatus);

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      // Send status update email (non-blocking)
      try {
        if (orderData && ['shipped', 'delivered', 'cancelled'].includes(newStatus)) {
          console.log(`📧 Sending ${newStatus} email for order ${orderId}`);
          await emailService.sendOrderStatusUpdate(orderData, newStatus);
          console.log(`✅ ${newStatus} email sent successfully`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send status update email:', emailError);
        // Don't show error to user - email failure shouldn't block status update
      }

      success('Order status updated successfully');
    } catch (err) {
      showError(err.message || 'Failed to update order status');
    }
  };

  // Handle export to PDF
  const handleExportToPDF = async (ordersToExport = null) => {
    // If no specific orders are provided, export all filtered orders
    let dataToExport = ordersToExport || filteredOrders;

    try {
      setExportFormat('pdf');
      setIsExporting(true);
      setExportProgress(0);

      // Ensure dataToExport is an array
      if (!Array.isArray(dataToExport)) {
        console.error('dataToExport is not an array:', dataToExport);
        dataToExport = Array.isArray(dataToExport) ? dataToExport : (dataToExport ? [dataToExport] : []);
      }

      // Log data for debugging
      console.log(`Preparing to export ${dataToExport.length} orders to PDF`);

      // Define columns for PDF
      const columns = [
        { header: 'Order #', dataKey: 'id' },
        { header: 'Customer', dataKey: 'customer_name' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Date', dataKey: 'created_at' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Total', dataKey: 'total_amount' }
      ];

      // Format data for better display in PDF with error handling
      const formattedData = [];
      for (const order of dataToExport) {
        if (!order) continue;

        try {
          formattedData.push({
            ...order,
            customer_name: order.customer_name || 'Unknown',
            email: order.email || 'No email',
            created_at: order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
            total_amount: `$${parseFloat(order.total_amount || 0).toFixed(2)}`,
            status: order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'
          });
        } catch (err) {
          console.error('Error formatting order data:', err, order);
        }
      }

      console.log(`Formatted ${formattedData.length} orders for PDF export`);

      await exportToPDF(
        formattedData,
        columns,
        'orders_export',
        'Orders Report',
        setExportProgress
      );

      success('Orders exported to PDF successfully');
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      showError(`Failed to export orders to PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export to Excel
  const handleExportToExcel = async (ordersToExport = null) => {
    // If no specific orders are provided, export all filtered orders
    let dataToExport = ordersToExport || filteredOrders;

    try {
      setExportFormat('xlsx');
      setIsExporting(true);
      setExportProgress(0);

      // Ensure dataToExport is an array
      if (!Array.isArray(dataToExport)) {
        console.error('dataToExport is not an array:', dataToExport);
        dataToExport = Array.isArray(dataToExport) ? dataToExport : (dataToExport ? [dataToExport] : []);
      }

      // Log data for debugging
      console.log(`Preparing to export ${dataToExport.length} orders to Excel`);

      // Define columns for Excel
      const columns = [
        { header: 'Order #', dataKey: 'id' },
        { header: 'Customer', dataKey: 'customer_name' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'Address', dataKey: 'shipping_address' },
        { header: 'Date', dataKey: 'created_at' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Payment Method', dataKey: 'payment_method' },
        { header: 'Total', dataKey: 'total_amount' }
      ];

      // Format data for better display in Excel with error handling
      const formattedData = [];
      for (const order of dataToExport) {
        if (!order) continue;

        try {
          formattedData.push({
            ...order,
            customer_name: order.customer_name || 'Unknown',
            email: order.email || 'No email',
            phone: order.phone || 'No phone',
            shipping_address: order.shipping_address || 'No address',
            created_at: order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString(),
            total_amount: parseFloat(order.total_amount || 0).toFixed(2),
            status: order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending',
            payment_method: order.payment_method || 'Unknown'
          });
        } catch (err) {
          console.error('Error formatting order data:', err, order);
        }
      }

      console.log(`Formatted ${formattedData.length} orders for Excel export`);

      await exportToXLSX(
        formattedData,
        columns,
        'orders_export',
        'Orders',
        setExportProgress
      );

      success('Orders exported to Excel successfully');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      showError(`Failed to export orders to Excel: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Filter orders by status
  const filteredOrders = useMemo(() => {
    return statusFilter === 'all'
      ? orders
      : orders.filter(order => order.status === statusFilter);
  }, [orders, statusFilter]);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Get current orders for pagination
  // If itemsPerPage is -1, show all orders
  const currentOrders = itemsPerPage === -1
    ? filteredOrders
    : filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  // Calculate indices for display purposes
  const indexOfFirstOrder = itemsPerPage === -1 ? 1 : (currentPage - 1) * itemsPerPage + 1;
  const indexOfLastOrder = itemsPerPage === -1 ? filteredOrders.length : Math.min(currentPage * itemsPerPage, filteredOrders.length);

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    setSelectAll(e.target.checked);
    if (e.target.checked) {
      // Select all orders on the current page
      setSelectedOrders(currentOrders.map(order => order.id));
    } else {
      // Deselect all orders
      setSelectedOrders([]);
    }
  };

  // Handle individual order selection
  const handleSelectOrder = (orderId, isChecked) => {
    if (isChecked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
      setSelectAll(false);
    }
  };

  // Handle export of selected orders
  const handleExportSelected = async (format) => {
    if (selectedOrders.length === 0) {
      showError('No orders selected');
      return;
    }

    // Get the selected orders data
    const ordersToExport = orders.filter(order =>
      selectedOrders.includes(order.id)
    );

    if (format === 'pdf') {
      await handleExportToPDF(ordersToExport);
    } else if (format === 'xlsx') {
      await handleExportToExcel(ordersToExport);
    }
  };

  // Function to get status badge color (dark theme)
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
        return 'bg-gray-600 text-gray-100';
    }
  };

  return (
    <div>
      {/* Export Progress Bar */}
      <ProgressBar
        progress={exportProgress}
        isVisible={isExporting}
        onComplete={() => setIsExporting(false)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Manage Orders</h2>
      </div>

      <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <label className="block text-midnight-200 mb-2">Filter by Status</label>
            <select
              className="p-2 border border-midnight-600 bg-midnight-800 text-midnight-100 rounded"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="text-midnight-300">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <LoadingSpinner size="xl" text="Loading orders..." variant="gear" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-midnight-900 border border-midnight-700 rounded-lg shadow">
          <p className="text-xl text-midnight-300">No orders found</p>
        </div>
      ) : (
        <div className="bg-midnight-900 border border-midnight-700 rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 bg-midnight-800 border-b border-midnight-700">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="select-all-orders"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-midnight-300 rounded border-midnight-600 bg-midnight-700 focus:ring-midnight-500"
              />
              <label htmlFor="select-all-orders" className="text-sm font-medium text-midnight-200">
                Select All
              </label>
              <span className="text-sm text-midnight-400">
                ({selectedOrders.length} selected)
              </span>
            </div>

              <div className="flex space-x-2">
                {selectedOrders.length > 0 && (
                  <div className="relative">
                    <button
                      className="bg-midnight-600 text-midnight-50 px-3 py-1 rounded text-sm hover:bg-midnight-500 flex items-center"
                      onClick={() => document.getElementById('exportSelectedOrdersDropdown').classList.toggle('hidden')}
                      disabled={isExporting}
                    >
                      <span>Export Selected</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div id="exportSelectedOrdersDropdown" className="hidden absolute right-0 mt-1 w-40 bg-midnight-800 border border-midnight-600 rounded-md shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleExportSelected('pdf')}
                          className="block w-full text-left px-4 py-2 text-sm text-midnight-200 hover:bg-midnight-700"
                          disabled={isExporting}
                        >
                          Export to PDF
                        </button>
                        <button
                          onClick={() => handleExportSelected('xlsx')}
                          className="block w-full text-left px-4 py-2 text-sm text-midnight-200 hover:bg-midnight-700"
                          disabled={isExporting}
                        >
                          Export to Excel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-midnight-800">
                  <tr>
                    <th className="p-4 w-10">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="text-left p-4 text-white min-w-[100px]">Order #</th>
                    <th className="text-left p-4 text-white min-w-[200px]">Customer</th>
                    <th className="text-left p-4 text-white min-w-[120px]">Date</th>
                    <th className="text-center p-4 text-white min-w-[120px]">Status</th>
                    <th className="text-right p-4 text-white min-w-[100px]">Total</th>
                    <th className="text-center p-4 text-white min-w-[150px]">Actions</th>
                  </tr>
                </thead>
              <tbody>
                {currentOrders.map(order => (
                  <tr key={order.id} className="border-t border-midnight-700">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        className="h-4 w-4 text-midnight-300 rounded border-midnight-600 bg-midnight-700 focus:ring-midnight-500"
                      />
                    </td>
                    <td className="p-4 font-semibold text-white">#{order.id}</td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-white">
                          {order.customer_name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-300">
                          {order.email || 'No email provided'}
                        </p>
                        {order.customer_phone && (
                          <p className="text-xs text-gray-400">
                            {order.customer_phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-white">{new Date(order.created_at || Date.now()).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <select
                        className={`px-3 py-1 rounded-full text-sm font-semibold border-0 ${getStatusColor(order.status && typeof order.status === 'string' ? order.status : 'pending')}`}
                        value={order.status && typeof order.status === 'string' ? order.status : 'pending'}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        <option value="pending" className="bg-yellow-600 text-yellow-100">Pending</option>
                        <option value="processing" className="bg-blue-600 text-blue-100">Processing</option>
                        <option value="shipped" className="bg-emerald-600 text-emerald-100">Shipped</option>
                        <option value="delivered" className="bg-green-600 text-green-100">Delivered</option>
                        <option value="cancelled" className="bg-red-600 text-red-100">Cancelled</option>
                      </select>
                    </td>
                    <td className="p-4 text-right font-semibold text-white">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col space-y-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => window.open(`/orders/${order.id}?print=true`, '_blank')}
                          className="text-green-400 hover:text-green-300 hover:underline text-sm"
                        >
                          Generate Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

          {/* Pagination */}
          <Pagination
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      {/* Show pagination info */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="mt-4 text-sm text-midnight-400">
          Showing {indexOfFirstOrder} to {indexOfLastOrder} of {filteredOrders.length} orders
        </div>
      )}
    </div>
  );
};

export default Orders;
