// Financial Analytics API Endpoint
// Provides comprehensive financial reporting and analytics

const db = require('../../lib/db');
const jwt = require('jsonwebtoken');

// Helper function to verify admin token
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    if (decoded.role !== 'admin') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify admin access
  const adminUser = verifyAdminToken(req);
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  try {
    const { period = '30', type = 'overview', startDate: customStartDate, endDate: customEndDate } = req.query;

    let startDateStr, endDateStr;

    // Use custom date range if provided, otherwise use period
    if (customStartDate && customEndDate) {
      console.log(`📊 Fetching financial analytics - Custom range: ${customStartDate} to ${customEndDate}, Type: ${type}`);
      startDateStr = new Date(customStartDate).toISOString();
      endDateStr = new Date(customEndDate + 'T23:59:59.999Z').toISOString();
    } else {
      console.log(`📊 Fetching financial analytics - Period: ${period} days, Type: ${type}`);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      startDateStr = startDate.toISOString();
      endDateStr = endDate.toISOString();
    }

    // Test endpoint
    if (type === 'test') {
      return res.status(200).json({
        success: true,
        message: 'Analytics API is working!',
        timestamp: new Date().toISOString(),
        dateRange: { startDateStr, endDateStr },
        dbConnected: true
      });
    }

    switch (type) {
      case 'overview':
        return await getFinancialOverview(res, startDateStr, endDateStr);
      case 'revenue':
        return await getRevenueAnalytics(res, startDateStr, endDateStr);
      case 'orders':
        return await getOrderAnalytics(res, startDateStr, endDateStr);
      case 'products':
        return await getProductAnalytics(res, startDateStr, endDateStr);
      case 'customers':
        return await getCustomerAnalytics(res, startDateStr, endDateStr);
      case 'export':
        return await exportFinancialData(res, startDateStr, endDateStr);
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid analytics type',
          availableTypes: ['overview', 'revenue', 'orders', 'products', 'customers', 'export', 'test']
        });
    }

  } catch (error) {
    console.error('❌ Financial analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Financial Overview Analytics
async function getFinancialOverview(res, startDate, endDate) {
  try {
    // Fetch orders in date range
    const ordersQuery = `
      SELECT total_amount, status, created_at, payment_method
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
    `;
    const { rows: orders } = await db.query(ordersQuery, [startDate, endDate]);

    // Calculate revenue metrics
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const completedRevenue = orders
      .filter(o => ['delivered', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const pendingRevenue = orders
      .filter(o => ['pending', 'processing', 'shipped'].includes(o.status))
      .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

    // Order counts
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status)).length;
    const pendingOrders = orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length;

    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Daily revenue breakdown
    const dailyRevenue = {};
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (parseFloat(order.total_amount) || 0);
    });

    // Revenue by payment method
    const revenueByPaymentMethod = {};
    orders.forEach(order => {
      const method = order.payment_method || 'unknown';
      revenueByPaymentMethod[method] = (revenueByPaymentMethod[method] || 0) + (parseFloat(order.total_amount) || 0);
    });

    return res.status(200).json({
      success: true,
      data: {
        period: { startDate, endDate },
        revenue: {
          total: totalRevenue,
          completed: completedRevenue,
          pending: pendingRevenue,
          averageOrderValue
        },
        orders: {
          total: totalOrders,
          completed: completedOrders,
          pending: pendingOrders
        },
        trends: {
          dailyRevenue,
          revenueByPaymentMethod
        }
      }
    });

  } catch (error) {
    console.error('Error in getFinancialOverview:', error);
    throw error;
  }
}

// Revenue Analytics with detailed breakdown
async function getRevenueAnalytics(res, startDate, endDate) {
  try {
    const ordersQuery = `
      SELECT total_amount, created_at, status
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      ORDER BY created_at ASC
    `;
    const { rows: orders } = await db.query(ordersQuery, [startDate, endDate]);

    // Group by month
    const monthlyRevenue = {};
    orders.forEach(order => {
      const month = new Date(order.created_at).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = { total: 0, completed: 0, pending: 0, orders: 0 };
      }
      const amount = parseFloat(order.total_amount) || 0;
      monthlyRevenue[month].total += amount;
      monthlyRevenue[month].orders += 1;

      if (['delivered', 'completed'].includes(order.status)) {
        monthlyRevenue[month].completed += amount;
      } else {
        monthlyRevenue[month].pending += amount;
      }
    });

    // Revenue growth calculation
    const months = Object.keys(monthlyRevenue).sort();
    const revenueGrowth = [];
    for (let i = 1; i < months.length; i++) {
      const currentMonth = monthlyRevenue[months[i]];
      const previousMonth = monthlyRevenue[months[i - 1]];
      const growth = previousMonth.total > 0
        ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
        : 0;
      revenueGrowth.push({
        month: months[i],
        growth: growth.toFixed(2)
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        monthlyRevenue,
        revenueGrowth,
        totalRevenue: Object.values(monthlyRevenue).reduce((sum, month) => sum + month.total, 0)
      }
    });

  } catch (error) {
    console.error('Error in getRevenueAnalytics:', error);
    throw error;
  }
}

// Order Analytics
async function getOrderAnalytics(res, startDate, endDate) {
  try {
    const ordersQuery = `
      SELECT status, total_amount, created_at, updated_at
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
    `;
    const { rows: orders } = await db.query(ordersQuery, [startDate, endDate]);

    const statusDistribution = {};
    orders.forEach(order => {
      const status = order.status || 'unknown';
      if (!statusDistribution[status]) {
        statusDistribution[status] = { count: 0, revenue: 0 };
      }
      statusDistribution[status].count += 1;
      statusDistribution[status].revenue += parseFloat(order.total_amount) || 0;
    });

    // Order fulfillment metrics
    const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
    const fulfillmentTimes = completedOrders.map(order => {
      const created = new Date(order.created_at);
      const updated = new Date(order.updated_at);
      return Math.round((updated - created) / (1000 * 60 * 60 * 24)); // days
    });

    const averageFulfillmentTime = fulfillmentTimes.length > 0
      ? fulfillmentTimes.reduce((sum, time) => sum + time, 0) / fulfillmentTimes.length
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        statusDistribution,
        fulfillmentMetrics: {
          averageFulfillmentTime: averageFulfillmentTime.toFixed(1),
          totalFulfilledOrders: completedOrders.length
        }
      }
    });

  } catch (error) {
    console.error('Error in getOrderAnalytics:', error);
    throw error;
  }
}

// Product Performance Analytics
async function getProductAnalytics(res, startDate, endDate) {
  try {
    console.log(`🛍️ Fetching product analytics from ${startDate} to ${endDate}`);

    const query = `
      SELECT 
        oi.quantity, oi.price, oi.product_id,
        p.name as product_name,
        c.name as category_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
    `;

    const { rows } = await db.query(query, [startDate, endDate]);

    const productPerformance = {};
    rows.forEach(item => {
      const productId = item.product_id;
      if (!productPerformance[productId]) {
        productPerformance[productId] = {
          name: item.product_name || 'Unknown Product',
          category: item.category_name || 'Uncategorized',
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0
        };
      }

      productPerformance[productId].totalQuantity += item.quantity || 0;
      productPerformance[productId].totalRevenue += (item.quantity || 0) * (parseFloat(item.price) || 0);
      productPerformance[productId].orderCount += 1;
    });

    // Sort by revenue
    const topProducts = Object.entries(productPerformance)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        topProducts,
        totalProductsSold: Object.keys(productPerformance).length
      }
    });

  } catch (error) {
    console.error('Error in getProductAnalytics:', error);
    return res.status(200).json({
      success: true,
      data: {
        topProducts: [],
        totalProductsSold: 0
      }
    });
  }
}

// Customer Analytics
async function getCustomerAnalytics(res, startDate, endDate) {
  try {
    const query = `
      SELECT 
        o.user_id, o.total_amount, o.created_at,
        u.email, u.first_name, u.last_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
    `;

    const { rows } = await db.query(query, [startDate, endDate]);

    const customerMetrics = {};
    rows.forEach(order => {
      const userId = order.user_id;
      if (!userId) return;

      if (!customerMetrics[userId]) {
        customerMetrics[userId] = {
          email: order.email,
          name: `${order.first_name || ''} ${order.last_name || ''}`.trim(),
          orderCount: 0,
          totalSpent: 0,
          firstOrder: order.created_at,
          lastOrder: order.created_at
        };
      }

      customerMetrics[userId].orderCount += 1;
      customerMetrics[userId].totalSpent += parseFloat(order.total_amount) || 0;

      if (new Date(order.created_at) > new Date(customerMetrics[userId].lastOrder)) {
        customerMetrics[userId].lastOrder = order.created_at;
      }
    });

    // Top customers by spending
    const topCustomers = Object.entries(customerMetrics)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Customer lifetime value
    const totalCustomers = Object.keys(customerMetrics).length;
    const totalRevenue = Object.values(customerMetrics).reduce((sum, c) => sum + c.totalSpent, 0);
    const averageCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    return res.status(200).json({
      success: true,
      data: {
        topCustomers,
        metrics: {
          totalCustomers,
          averageCustomerValue: averageCustomerValue.toFixed(2),
          totalRevenue: totalRevenue.toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('Error in getCustomerAnalytics:', error);
    throw error;
  }
}

// Export Financial Data
async function exportFinancialData(res, startDate, endDate) {
  try {
    console.log(`📤 Exporting financial data from ${startDate} to ${endDate}`);

    const query = `
      SELECT 
        o.id as order_id, o.total_amount, o.status, o.payment_method, 
        o.shipping_address, o.created_at, o.updated_at, o.user_id,
        u.email, u.first_name, u.last_name, u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
      ORDER BY o.created_at DESC
    `;

    const { rows: orders } = await db.query(query, [startDate, endDate]);

    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        summary: {
          totalOrders: 0,
          totalItems: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          dateRange: { startDate, endDate },
          exportedRows: 0,
          message: 'No orders found for the specified date range'
        }
      });
    }

    // Get order items for each order
    const orderIds = orders.map(o => o.order_id);
    const itemsQuery = `
      SELECT oi.order_id, oi.product_id, oi.quantity, oi.price, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ANY($1)
    `;
    const { rows: items } = await db.query(itemsQuery, [orderIds]);

    // Group items by order_id
    const itemsByOrder = {};
    items.forEach(item => {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push(item);
    });

    // Format data for CSV export
    const csvData = [];
    orders.forEach(order => {
      const orderItems = itemsByOrder[order.order_id] || [];

      if (orderItems.length > 0) {
        orderItems.forEach(item => {
          csvData.push({
            order_id: order.order_id,
            order_date: new Date(order.created_at).toLocaleDateString(),
            order_time: new Date(order.created_at).toLocaleTimeString(),
            customer_email: order.email || '',
            customer_name: `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Unknown',
            customer_phone: order.phone || '',
            order_total: parseFloat(order.total_amount) || 0,
            order_status: order.status || '',
            payment_method: order.payment_method || '',
            shipping_address: order.shipping_address || '',
            product_name: item.product_name || 'Unknown Product',
            item_quantity: item.quantity || 0,
            item_price: parseFloat(item.price) || 0,
            item_total: (parseFloat(item.price) || 0) * (item.quantity || 0),
            updated_at: new Date(order.updated_at || order.created_at).toLocaleDateString()
          });
        });
      } else {
        csvData.push({
          order_id: order.order_id,
          order_date: new Date(order.created_at).toLocaleDateString(),
          order_time: new Date(order.created_at).toLocaleTimeString(),
          customer_email: order.email || '',
          customer_name: `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Unknown',
          customer_phone: order.phone || '',
          order_total: parseFloat(order.total_amount) || 0,
          order_status: order.status || '',
          payment_method: order.payment_method || '',
          shipping_address: order.shipping_address || '',
          product_name: 'No items',
          item_quantity: 0,
          item_price: 0,
          item_total: 0,
          updated_at: new Date(order.updated_at || order.created_at).toLocaleDateString()
        });
      }
    });

    // Calculate summary statistics
    const uniqueOrders = [...new Set(csvData.map(row => row.order_id))];
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const totalItems = csvData.reduce((sum, row) => sum + (row.item_quantity || 0), 0);

    return res.status(200).json({
      success: true,
      data: csvData,
      summary: {
        totalOrders: uniqueOrders.length,
        totalItems: totalItems,
        totalRevenue: totalRevenue,
        averageOrderValue: uniqueOrders.length > 0 ? totalRevenue / uniqueOrders.length : 0,
        dateRange: { startDate, endDate },
        exportedRows: csvData.length
      }
    });

  } catch (error) {
    console.error('Error in exportFinancialData:', error);
    throw error;
  }
}
