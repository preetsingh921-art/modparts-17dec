// Inventory API Client
// Auto-detect API URL based on environment
const getApiBaseUrl = () => {
  // If VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In browser, use same origin for production
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/api`;
  }
  // Default to localhost for development
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

// Helper function to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ============================================
// BARCODE API
// ============================================

export const barcodeAPI = {
  // Generate barcode for a single product
  generate: async (productId) => {
    const response = await fetch(`${API_BASE_URL}/inventory/barcode?action=generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ product_id: productId }),
    });
    return response.json();
  },

  // Generate barcodes for multiple products
  bulkGenerate: async (productIds) => {
    const response = await fetch(`${API_BASE_URL}/inventory/barcode?action=bulk-generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ product_ids: productIds }),
    });
    return response.json();
  },

  // Lookup product by barcode (used when scanning)
  scan: async (barcode) => {
    const response = await fetch(`${API_BASE_URL}/inventory/barcode?action=scan&barcode=${encodeURIComponent(barcode)}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  // Get print data for labels
  getPrintData: async (productIds) => {
    const response = await fetch(`${API_BASE_URL}/inventory/barcode?action=print-data`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ product_ids: productIds }),
    });
    return response.json();
  },
};

// ============================================
// WAREHOUSE API
// ============================================

export const warehouseAPI = {
  // Get all warehouses
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/inventory/warehouses`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  // Get single warehouse
  getOne: async (id) => {
    const response = await fetch(`${API_BASE_URL}/inventory/warehouses?id=${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  // Create warehouse
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/inventory/warehouses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Update warehouse
  update: async (data) => {
    const response = await fetch(`${API_BASE_URL}/inventory/warehouses`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Delete warehouse
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/inventory/warehouses?id=${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },
};

// ============================================
// BIN API
// ============================================

export const binAPI = {
  // Get all bins (optionally by warehouse)
  getAll: async (warehouseId = null) => {
    let url = `${API_BASE_URL}/inventory/bins`;
    if (warehouseId) {
      url += `?warehouse_id=${warehouseId}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  // Get single bin
  getOne: async (id) => {
    const response = await fetch(`${API_BASE_URL}/inventory/bins?id=${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  // Create bin
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/inventory/bins`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Update bin
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/inventory/bins?id=${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Delete bin
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/inventory/bins?id=${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },
};

// ============================================
// INVENTORY MOVEMENTS API
// ============================================

export const movementsAPI = {
  // Get all movements (with optional filters)
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/inventory/movements?${params}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.json();
  },

  // Ship products with optional quantity (default 1)
  ship: async (productIds, fromWarehouseId = 1, toWarehouseId = 2, notes = null, quantity = 1) => {
    const response = await fetch(`${API_BASE_URL}/inventory/movements?action=ship`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        product_ids: productIds,
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        notes,
        quantity,
      }),
    });
    return response.json();
  },

  // Receive product at destination (requires movement_id and warehouse_id for validation)
  receive: async ({ movementId, binNumber, warehouseId }) => {
    const response = await fetch(`${API_BASE_URL}/inventory/movements?action=receive`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        movement_id: movementId,
        bin_number: binNumber,
        warehouse_id: warehouseId,
      }),
    });
    return response.json();
  },

  // Assign product to a bin
  assignBin: async (productId, binNumber, warehouseId = 2) => {
    const response = await fetch(`${API_BASE_URL}/inventory/movements?action=assign-bin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        product_id: productId,
        bin_number: binNumber,
        warehouse_id: warehouseId,
      }),
    });
    return response.json();
  },

  // Add unexpected inventory (product not expected, admin confirmed)
  addUnexpected: async ({ partNumber, warehouseId, binNumber, quantity = 1 }) => {
    const response = await fetch(`${API_BASE_URL}/inventory/movements?action=add-unexpected`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        part_number: partNumber,
        warehouse_id: warehouseId,
        bin_number: binNumber,
        quantity,
      }),
    });
    return response.json();
  },

  // Update movement status
  updateStatus: async (id, status, notes = null) => {
    const response = await fetch(`${API_BASE_URL}/inventory/movements`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ id, status, notes }),
    });
    return response.json();
  },
};

// ============================================
// BIN CONTENTS API - Products grouped by bin
// ============================================

export const binContentsAPI = {
  // Get products grouped by bin for a warehouse
  getByWarehouse: async (warehouseId, search = '') => {
    const params = new URLSearchParams({ warehouse_id: warehouseId });
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE_URL}/inventory/bin-contents?${params}`, {
      headers: getHeaders(),
    });
    return response.json();
  },
};

// Export all as default
export default {
  barcode: barcodeAPI,
  warehouse: warehouseAPI,
  bin: binAPI,
  movements: movementsAPI,
  binContents: binContentsAPI,
};
