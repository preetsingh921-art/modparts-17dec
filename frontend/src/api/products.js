import api from './config';
import axios from 'axios';

// Function to upload product image using base64 encoding
export const uploadProductImage = async (file) => {
  try {
    console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Convert file to base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    console.log('File converted to base64, length:', base64Data.length);

    // Get auth token from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user.token || '';

    console.log('Using auth token:', token ? 'Token exists' : 'No token');

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Prepare JSON payload
    const payload = {
      filename: file.name,
      mimetype: file.type,
      data: base64Data
    };

    console.log('Making upload request to:', '/upload');
    console.log('Headers:', headers);
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');

    const response = await api.post('/upload', payload, {
      headers,
      timeout: 30000, // 30 second timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Upload response:', response.data);

    if (response.data.success) {
      // Check for file_url first (new format), then fall back to data.url (old format)
      const fileUrl = response.data.file_url || response.data.data?.url;

      if (fileUrl) {
        console.log('Upload successful:', fileUrl);
        return fileUrl;
      } else {
        console.error('No file URL found in response:', response.data);
        throw new Error('No file URL received from server');
      }
    } else {
      throw new Error(response.data.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    console.error('Error details:', error.response?.data || 'No response data');
    throw new Error(error.response?.data?.message || 'Failed to upload image');
  }
};

export const getProducts = async (params = {}) => {
  try {
    console.log('🔍 getProducts: Starting API call with params:', params);

    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      categories = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      warehouse_id = '',
      bin_number = ''  // Add bin_number support
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);
    if (categories) queryParams.append('categories', categories);
    if (warehouse_id) queryParams.append('warehouse_id', warehouse_id);
    if (bin_number) queryParams.append('bin_number', bin_number);  // Pass bin_number to API

    const url = `/products?${queryParams}`;
    console.log('🔍 getProducts: Making request to:', url);

    const response = await api.get(url);

    console.log('🔍 getProducts: Raw API response:', {
      status: response.status,
      statusText: response.statusText,
      dataKeys: Object.keys(response.data || {}),
      dataType: typeof response.data,
      hasData: !!response.data?.data,
      dataLength: response.data?.data?.length
    });

    // Process products to ensure category_id is a string for consistent comparison and filter out null entries
    const products = (response.data.data || []).filter(product => product && product.id && product.name);
    const processedProducts = products.map(product => ({
      ...product,
      category_id: String(product.category_id) // Ensure category_id is a string
    }));

    console.log(`✅ getProducts: Processed ${processedProducts.length} products (page ${page})`);
    console.log('🔍 getProducts: Sample products:', processedProducts.slice(0, 2));

    return {
      products: processedProducts,
      pagination: response.data.pagination,
      filters: response.data.filters
    };
  } catch (error) {
    console.error('❌ getProducts: Error fetching products:', error);
    console.error('❌ getProducts: Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return {
      products: [],
      pagination: null,
      filters: null
    };
  }
};

export const getProductById = async (id) => {
  try {
    console.log('🔍 getProductById: Fetching product with ID:', id);
    const url = `/products/${id}`;
    console.log('🔍 getProductById: Making request to:', url);

    const response = await api.get(url);

    console.log('✅ getProductById: Response received:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data?.data,
      dataKeys: Object.keys(response.data || {})
    });
    console.log('🔍 getProductById: Product data:', response.data.data);

    return response.data.data;
  } catch (error) {
    console.error('❌ getProductById: Error fetching product:', error);
    console.error('❌ getProductById: Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    throw new Error(error.response?.data?.message || 'Failed to fetch product');
  }
};

export const getProductsByCategory = async (categoryId) => {
  try {
    // Ensure categoryId is properly formatted
    const formattedCategoryId = String(categoryId);
    console.log(`Fetching products for category ID: ${formattedCategoryId}`);

    // Use 'category' parameter instead of 'category_id' to match backend API
    const response = await api.get(`/products?category=${formattedCategoryId}`);

    // Process products to ensure category_id is a string for consistent comparison
    const products = response.data.data || [];
    const processedProducts = products.map(product => ({
      ...product,
      category_id: String(product.category_id) // Ensure category_id is a string
    }));

    console.log(`Found ${processedProducts.length} products for category ${formattedCategoryId}`);
    return processedProducts;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
};

export const searchProducts = async (query) => {
  try {
    const response = await api.get(`/products?search=${query}`);

    // Process products to ensure category_id is a string for consistent comparison
    const products = response.data.data || [];
    const processedProducts = products.map(product => ({
      ...product,
      category_id: String(product.category_id) // Ensure category_id is a string
    }));

    console.log(`Search found ${processedProducts.length} products for query "${query}"`);
    return processedProducts;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
};

export const createProduct = async (productData) => {
  try {
    const response = await api.post('/products', productData);
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw new Error(error.response?.data?.message || 'Failed to create product');
  }
};

export const updateProduct = async (productData) => {
  try {
    const response = await api.put(`/products/${productData.id}`, productData);
    return response.data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw new Error(error.response?.data?.message || 'Failed to update product');
  }
};

export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete product');
  }
};

/**
 * Create multiple products at once (bulk import)
 * Skips duplicates by matching product name against existing products.
 * Includes rate-limit protection with delays and retry logic.
 *
 * @param {Array} productsData - Array of product objects to create
 * @param {Function} onProgress - Optional callback: ({ current, total, created, skipped, failed, currentName, status })
 * @returns {Promise<Object>} - { created: [], skipped: [], failed: [] }
 */
export const bulkCreateProducts = async (productsData, onProgress) => {
  const results = { created: [], skipped: [], failed: [] };

  // Helper: delay between requests to avoid rate limiting
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper: create product with retry on 429
  const createWithRetry = async (productData, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await createProduct(productData);
      } catch (error) {
        const is429 = error.message?.includes('429') || error.message?.includes('Too many') || error.message?.includes('rate');
        if (is429 && attempt < retries) {
          console.warn(`Rate limited on attempt ${attempt}, waiting ${attempt * 2}s before retry...`);
          await delay(attempt * 2000); // exponential backoff: 2s, 4s, 6s
          continue;
        }
        throw error;
      }
    }
  };

  try {
    // Fetch existing products to detect duplicates
    const existingResult = await getProducts({ limit: 5000 });
    // getProducts returns { products: [...], pagination: {...} }
    const existingList = existingResult?.products || existingResult || [];
    const existingNames = new Set(
      (Array.isArray(existingList) ? existingList : [])
        .map(p => (p.name || '').toLowerCase().trim())
    );

    const total = productsData.length;

    for (let i = 0; i < total; i++) {
      const productData = productsData[i];
      const productName = (productData.name || '').trim();
      const normalizedName = productName.toLowerCase();

      // Check for duplicate
      if (existingNames.has(normalizedName)) {
        results.skipped.push(productData);
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            created: results.created.length,
            skipped: results.skipped.length,
            failed: results.failed.length,
            currentName: productName,
            status: 'skipped'
          });
        }
        continue;
      }

      try {
        const response = await createWithRetry(productData);
        results.created.push(response);
        existingNames.add(normalizedName); // prevent duplicates within same batch
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            created: results.created.length,
            skipped: results.skipped.length,
            failed: results.failed.length,
            currentName: productName,
            status: 'created'
          });
        }
      } catch (error) {
        console.error(`Error creating product ${productName}:`, error);
        results.failed.push({ ...productData, error: error.message });
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            created: results.created.length,
            skipped: results.skipped.length,
            failed: results.failed.length,
            currentName: productName,
            status: 'failed'
          });
        }
      }

      // Throttle: wait 300ms between each API call to avoid rate limits
      if (i < total - 1) {
        await delay(300);
      }
    }

    return results;
  } catch (error) {
    console.error('Error in bulk product creation:', error);
    throw new Error(error.message || 'Failed to import products');
  }
};

/**
 * Get current stock for a product
 *
 * @param {number} productId - Product ID
 * @returns {Promise<number>} - Current stock quantity
 */
export const getProductStock = async (productId) => {
  try {
    const response = await api.get(`/products/${productId}`);
    return response.data.data.quantity || 0;
  } catch (error) {
    console.error('Error fetching product stock:', error);
    throw new Error('Failed to fetch product stock');
  }
};

/**
 * Validate stock availability for cart operations
 *
 * @param {number} productId - Product ID
 * @param {number} requestedQuantity - Requested quantity
 * @returns {Promise<boolean>} - True if stock is available
 */
export const validateStock = async (productId, requestedQuantity) => {
  try {
    const currentStock = await getProductStock(productId);

    if (currentStock <= 0) {
      throw new Error('Product is out of stock');
    }

    if (requestedQuantity > currentStock) {
      throw new Error(`Only ${currentStock} items available in stock`);
    }

    return true;
  } catch (error) {
    console.error('Stock validation error:', error);
    throw error;
  }
};
