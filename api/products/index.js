const db = require('../../lib/db');

module.exports = async function handler(req, res) {
  // CORS is handled by dev-server middleware

  try {
    if (req.method === 'GET') {
      // Get pagination parameters from query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12; // Default 12 products per page
      const search = req.query.search || '';
      const category = req.query.category || req.query.category_id || ''; // Support both parameter names
      const categories = req.query.categories || ''; // Multiple categories comma-separated
      const sortBy = req.query.sortBy || 'created_at';
      const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
      const warehouseId = req.query.warehouse_id || null; // Filter by warehouse

      console.log('🔍 Products API called with filters (Neon):', {
        page, limit, search, category, categories, sortBy, sortOrder, minPrice, maxPrice, warehouseId
      });

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build Query - Include warehouse join
      let queryText = `
        SELECT 
          p.*, 
          c.name as category_name, 
          c.description as category_description,
          w.name as warehouse_name,
          w.location as warehouse_location
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN warehouses w ON p.warehouse_id = w.id
        WHERE 1=1
      `;
      let countQueryText = `
        SELECT COUNT(*) as total_count 
        FROM products p
        WHERE 1=1
      `;

      const queryParams = [];
      let paramCount = 1;

      // Add Search Filter - search in name, description, part_number, and barcode
      if (search) {
        const searchClause = ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.part_number ILIKE $${paramCount} OR p.barcode ILIKE $${paramCount} OR p.part_number = $${paramCount + 1})`;
        queryText += searchClause;
        countQueryText += searchClause;
        queryParams.push(`%${search}%`);
        queryParams.push(search); // Exact match for part_number
        paramCount += 2;
      }

      // Add Category Filter (Single)
      if (category) {
        const catClause = ` AND p.category_id = $${paramCount}`;
        queryText += catClause;
        countQueryText += catClause;
        queryParams.push(category);
        paramCount++;
      }

      // Add Multiple Categories Filter
      if (categories) {
        const categoryIds = categories.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (categoryIds.length > 0) {
          // Manually build IN clause list since pg doesn't support array directly in this context easily without ANY
          // Using ANY($n) approach for array
          const catMultiClause = ` AND p.category_id = ANY($${paramCount}::int[])`;
          queryText += catMultiClause;
          countQueryText += catMultiClause;
          queryParams.push(categoryIds);
          paramCount++;
        }
      }

      // Add Price Range Filter
      if (minPrice !== null) {
        const minClause = ` AND p.price >= $${paramCount}`;
        queryText += minClause;
        countQueryText += minClause;
        queryParams.push(minPrice);
        paramCount++;
      }
      if (maxPrice !== null) {
        const maxClause = ` AND p.price <= $${paramCount}`;
        queryText += maxClause;
        countQueryText += maxClause;
        queryParams.push(maxPrice);
        paramCount++;
      }

      // Add Warehouse Filter
      if (warehouseId) {
        const warehouseClause = ` AND p.warehouse_id = $${paramCount}`;
        queryText += warehouseClause;
        countQueryText += warehouseClause;
        queryParams.push(parseInt(warehouseId));
        paramCount++;
      }

      // Add Sorting
      // Validate sortBy to prevent SQL injection
      const allowedSortColumns = ['name', 'price', 'created_at', 'updated_at', 'quantity'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';

      queryText += ` ORDER BY ${safeSortBy} ${sortOrder}`;

      // Add Pagination
      queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

      // Execute Queries
      // We need separate params for main query and count query because count query doesn't have LIMIT/OFFSET
      const countParams = queryParams.slice(); // Copy params used so far

      // Add limit and offset to main query params
      queryParams.push(limit, offset);

      console.log('🔍 Executing Neon Query:', queryText);

      const [productsResult, countResult] = await Promise.all([
        db.query(queryText, queryParams),
        db.query(countQueryText, countParams)
      ]);

      const products = productsResult.rows;
      const count = parseInt(countResult.rows[0].total_count);

      // Format response to match expected frontend structure
      // Adjust structure if necessary. The SQL JOIN already puts category_name in the row.
      // Frontend expects: { category_name: '...', ... } which we have, 
      // OR nested categories object? 
      // Previous Supabase response structure:
      // categories: { id, name, description }
      // And frontend often maps it. 

      const formattedProducts = products.map(p => ({
        ...p,
        categories: {
          id: p.category_id,
          name: p.category_name,
          description: p.category_description
        }
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.status(200).json({
        message: 'Products retrieved successfully',
        data: formattedProducts,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          search,
          category,
          sortBy,
          sortOrder: sortOrder === 'ASC' ? 'asc' : 'desc'
        }
      });

    } else if (req.method === 'POST') {
      // Create new product (admin only)
      const {
        name, description, condition_status, price, quantity,
        category_id, image_url, part_number, barcode,
        warehouse_id, bin_number
      } = req.body;

      console.log('🔍 Creating product (Neon) with data:', {
        name, description, condition_status, price, quantity, category_id, image_url, part_number, barcode
      });

      if (!name || !condition_status || !price || price < 0 || quantity < 0) {
        return res.status(400).json({
          message: 'Name, condition status, valid price, and quantity are required'
        });
      }

      // Barcode logic:
      // ALWAYS use part_number as barcode when available (so scanning returns the part number)
      // Only use explicit barcode or auto-generate if no part_number exists
      let generatedBarcode;
      if (part_number) {
        // Part number is the barcode - this is what scanners will read
        generatedBarcode = part_number;
      } else if (barcode) {
        generatedBarcode = barcode;
      } else {
        // Auto-generate from name initials + timestamp for uniqueness
        const initials = name.split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0, 4);
        generatedBarcode = `${initials}-${Date.now().toString(36).toUpperCase()}`;
      }


      const insertQuery = `
        INSERT INTO products (
          name, description, condition_status, price, quantity, 
          category_id, image_url, part_number, barcode,
          warehouse_id, bin_number, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        RETURNING *
      `;

      const values = [
        name,
        description || null,
        condition_status,
        parseFloat(price),
        parseInt(quantity),
        category_id ? parseInt(category_id) : null,
        image_url || null,
        part_number || null,
        generatedBarcode,
        warehouse_id ? parseInt(warehouse_id) : null,
        bin_number || null
      ];

      try {
        const { rows } = await db.query(insertQuery, values);
        const product = rows[0];

        console.log('✅ Product created successfully (Neon):', product.id, 'Barcode:', product.barcode);
        res.status(201).json({
          message: 'Product created successfully',
          data: product
        });
      } catch (error) {
        console.error('❌ Neon error creating product:', error);
        return res.status(500).json({
          message: 'Failed to create product',
          error: error.message
        });
      }


    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
