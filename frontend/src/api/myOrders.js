import api from './config';

// Create a simple function to fetch orders
export const fetchMyOrders = async () => {
  console.log('=== FETCHING MY ORDERS ===');

  try {
    const response = await api.get('/orders');
    console.log('Orders fetched successfully:', response.data);

    // Extract orders from response
    let orders = [];
    if (response.data && response.data.data) {
      orders = response.data.data;
    } else if (Array.isArray(response.data)) {
      orders = response.data;
    } else {
      console.warn('Unexpected response format:', response.data);
      return [];
    }

    // Transform each order to match frontend expectations
    const transformedOrders = orders.map(order => ({
      ...order,
      // Map order_items to items and transform the structure
      items: (order.order_items || []).map(item => {
        console.log('Transforming order item:', item);
        return {
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity || 0,
          price: item.price || 0,
          // Extract product name from nested product object
          product_name: item.product?.name || 'Unknown Product',
          // Include other item fields if needed
          ...item
        };
      })
    }));

    return transformedOrders;
  } catch (error) {
    console.error('Error fetching orders:', error);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    // Return empty array on error
    return [];
  }
};

// Function to create a test order if none exist
export const createTestOrder = async () => {
  console.log('=== CREATING TEST ORDER ===');

  try {
    // Create a test order using the Node.js API
    const testOrderData = {
      shipping_address: 'Test Address, Test City, Test State 12345',
      payment_method: 'test',
      items: [
        {
          product_id: 1,
          quantity: 1,
          price: 10.00
        }
      ],
      payment_status: 'completed',
      transaction_id: 'test_' + Date.now(),
      reference_number: 'TEST_' + Date.now(),
      order_number: 'ORD_' + Date.now(),
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      city: 'Test City',
      state: 'Test State',
      zip_code: '12345',
      phone: '555-0123'
    };

    const response = await api.post('/orders', testOrderData);
    console.log('Test order created successfully:', response.data);

    // Return the created order in an array format for consistency
    return response.data.data ? [response.data.data] : [];
  } catch (error) {
    console.error('Error creating test order:', error);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    // Return empty array on error
    return [];
  }
};

// Function to get a single order by ID
export const fetchOrderById = async (orderId) => {
  console.log('=== FETCHING ORDER BY ID ===', orderId);

  try {
    const response = await api.get(`/orders/${orderId}`);
    console.log('Order fetched successfully:', response.data);

    const orderData = response.data?.data || response.data;
    if (!orderData) {
      console.log('Order not found with ID:', orderId);
      return null;
    }

    const transformedOrder = {
      ...orderData,
      items: (orderData.items || orderData.order_items || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity || 0,
        price: item.price || 0,
        product_name: item.product_name || item.product?.name || 'Unknown Product',
        image_url: item.image_url || item.product?.image_url,
        part_number: item.part_number || item.product?.part_number,
        ...item
      }))
    };

    console.log('Transformed order:', transformedOrder);
    return transformedOrder;
  } catch (error) {
    console.error('Error fetching order:', error);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    return null;
  }
};
