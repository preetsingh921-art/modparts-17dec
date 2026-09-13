const db = require('../../lib/db');
const { verifyAdminToken } = require('../../lib/auth');

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
      const globalCatalog = req.query.global_catalog === 'true'; // Fetch global unique catalog

      // Geo-IP: detect visitor country for warehouse-scoped stock routing
      const visitorCountry = req.query.country || req.headers['cf-ipcountry'] || req.headers['x-visitor-country'] || null;

      console.log('🔍 Products API called with filters (Neon):', {
        page, limit, search, category, categories, sortBy, sortOrder, minPrice, maxPrice, warehouseId, globalCatalog, visitorCountry
      });

      // Calculate offset
      const offset = (page - 1) * limit;

      // Bin Number Filter
      const binNumber = req.query.bin_number || null;

      // Helper function to build WHERE clauses with distinct parameter tracking
      function buildWhereClauses(startIndex) {
        const clauses = [];
        const params = [];
        let idx = startIndex;

        if (search) {
          clauses.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx} OR p.part_number ILIKE $${idx} OR p.barcode ILIKE $${idx} OR p.ref_no ILIKE $${idx} OR p.part_number = $${idx + 1})`);
          params.push(`%${search}%`, search);
          idx += 2;
        }
        if (category) {
          clauses.push(`p.category_id = $${idx}`);
          params.push(category);
          idx++;
        }
        if (categories) {
          const categoryIds = categories.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          if (categoryIds.length > 0) {
            clauses.push(`p.category_id = ANY($${idx}::int[])`);
            params.push(categoryIds);
            idx++;
          }
        }
        if (minPrice !== null) {
          clauses.push(`p.price >= $${idx}`);
          params.push(minPrice);
          idx++;
        }
        if (maxPrice !== null) {
          clauses.push(`p.price <= $${idx}`);
          params.push(maxPrice);
          idx++;
        }
        if (warehouseId && !globalCatalog) {
          clauses.push(`p.warehouse_id = $${idx}`);
          params.push(parseInt(warehouseId));
          idx++;
        }
        if (binNumber) {
          clauses.push(`p.bin_number = $${idx}`);
          params.push(binNumber);
          idx++;
        }

        const whereSql = clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '';
        return { whereSql, params, nextIndex: idx };
      }

      // 1. COUNT QUERY: built with its own independent parameter mapping starting at $1
      const countFilter = buildWhereClauses(1);
      const countSelectClause = globalCatalog 
        ? `SELECT COUNT(DISTINCT COALESCE(p.barcode, p.part_number)) as total_count` 
        : `SELECT COUNT(*) as total_count`;
      const countQueryText = `
        ${countSelectClause}
        FROM products p
        WHERE 1=1${countFilter.whereSql}
      `;
      const countParams = countFilter.params;

      // 2. MAIN QUERY: built with its own parameter list
      const queryParams = [];
      let selectClause = `
        SELECT 
          p.*, 
          c.name as category_name, 
          c.description as category_description,
          w.name as warehouse_name,
          w.location as warehouse_location,
          w.country as warehouse_country
      `;

      if (globalCatalog) {
        selectClause = `
        SELECT DISTINCT ON (COALESCE(p.barcode, p.part_number))
          p.*, 
          c.name as category_name, 
          c.description as category_description,
          w.name as warehouse_name,
          w.location as warehouse_location,
          w.country as warehouse_country`;

        if (warehouseId) {
          queryParams.push(parseInt(warehouseId)); // $1
          selectClause += `,
          COALESCE((SELECT quantity FROM products p2 WHERE COALESCE(p2.barcode, p2.part_number) = COALESCE(p.barcode, p.part_number) AND p2.warehouse_id = $1 LIMIT 1), 0) as local_quantity,
          (SELECT id FROM products p3 WHERE COALESCE(p3.barcode, p3.part_number) = COALESCE(p.barcode, p.part_number) AND p3.warehouse_id = $1 LIMIT 1) as local_id,
          (SELECT warehouse_id FROM products p4 WHERE COALESCE(p4.barcode, p4.part_number) = COALESCE(p.barcode, p.part_number) AND p4.warehouse_id = $1 LIMIT 1) as local_warehouse_id
          `;
        }
      }

      // Build WHERE clauses for main query starting after any select clause parameters
      const mainFilter = buildWhereClauses(queryParams.length + 1);
      queryParams.push(...mainFilter.params);

      // Geo-IP Country Filter: India visitors get IND warehouse products prioritized
      let geoSortPrefix = '';
      if (visitorCountry) {
        const upperCountry = visitorCountry.toUpperCase();
        if (upperCountry === 'IN' || upperCountry === 'IND') {
          geoSortPrefix = `CASE WHEN w.country ILIKE 'IND%' OR w.country ILIKE 'India%' THEN 0 WHEN w.country IS NULL THEN 1 ELSE 2 END, `;
          console.log('🇮🇳 Geo-IP: Prioritizing IND warehouse products');
        }
      }
      if (!geoSortPrefix) {
        geoSortPrefix = `CASE WHEN w.country ILIKE 'IND%' OR w.country ILIKE 'India%' THEN 0 ELSE 1 END, `;
      }

      // Add Sorting
      const allowedSortColumns = ['name', 'price', 'created_at', 'updated_at', 'quantity'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';

      let orderClause = '';
      if (globalCatalog) {
        orderClause = ` ORDER BY COALESCE(p.barcode, p.part_number), ${geoSortPrefix}${safeSortBy} ${sortOrder}`;
      } else {
        orderClause = ` ORDER BY ${geoSortPrefix}${safeSortBy} ${sortOrder}`;
      }

      const limitParamIdx = mainFilter.nextIndex;
      const offsetParamIdx = mainFilter.nextIndex + 1;
      queryParams.push(limit, offset);

      const queryText = `
        ${selectClause}
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN warehouses w ON p.warehouse_id = w.id
        WHERE 1=1${mainFilter.whereSql}
        ${orderClause}
        LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
      `;

      console.log('🔍 Executing Neon Query:', queryText);
      console.log('🔍 Executing Count Query:', countQueryText);

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

      const formattedProducts = products.map(p => {
        // For global catalog view, override fields with local warehouse values if requested
        const qty = p.local_quantity !== undefined ? parseInt(p.local_quantity) : p.quantity;
        const prodId = p.local_id !== undefined ? (p.local_id || p.id) : p.id;
        const wId = p.local_warehouse_id !== undefined ? p.local_warehouse_id : p.warehouse_id;
        
        return {
          ...p,
          quantity: qty,
          id: prodId,
          warehouse_id: wId,
          not_in_local_warehouse: p.local_warehouse_id === null, // true if product doesn't exist in local warehouse
          categories: {
            id: p.category_id,
            name: p.category_name,
            description: p.category_description
          }
        };
      });

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
      const adminUser = verifyAdminToken(req);
      if (!adminUser) {
        return res.status(403).json({ message: 'Admin access required to create products' });
      }

      const {
        name, description, condition_status, price, quantity,
        category_id, image_url, images, part_number, barcode,
        warehouse_id, bin_number, ref_no
      } = req.body;

      console.log('🔍 Creating product (Neon) with data:', {
        name, description, condition_status, price, quantity, category_id, image_url, part_number, barcode
      });

      if (!name || !condition_status || !price || price < 0) {
        return res.status(400).json({
          message: 'Name, condition status, and valid price are required'
        });
      }

      // Default quantity to 0 - stock only increases when parts are received via scan
      const finalQuantity = quantity !== undefined && quantity !== null ? parseInt(quantity) : 0;

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

      // Format images array
      let formattedImages = [];
      if (Array.isArray(images) && images.length > 0) {
        formattedImages = images.filter(Boolean);
      } else if (image_url) {
        formattedImages = [image_url];
      }
      const primaryImageUrl = formattedImages[0] || image_url || null;

      const insertQuery = `
        INSERT INTO products (
          name, description, condition_status, price, quantity, 
          category_id, image_url, images, part_number, barcode,
          warehouse_id, bin_number, ref_no, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, NOW(), NOW()
        )
        RETURNING *
      `;

      const values = [
        name,
        description || null,
        condition_status,
        parseFloat(price),
        finalQuantity,
        category_id ? parseInt(category_id) : null,
        primaryImageUrl,
        JSON.stringify(formattedImages),
        part_number || null,
        generatedBarcode,
        warehouse_id ? parseInt(warehouse_id) : null,
        bin_number || null,
        ref_no || null
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
