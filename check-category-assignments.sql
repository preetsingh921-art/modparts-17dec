-- Diagnostic query to check category assignments
-- Run this in your database to see which categories have products

SELECT 
  c.id as category_id,
  c.name as category_name,
  COUNT(p.id) as product_count,
  ARRAY_AGG(p.name ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL) as sample_products
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Find products with NULL category_id
SELECT 
  id,
  name,
  category_id,
  part_number
FROM products
WHERE category_id IS NULL
ORDER BY name
LIMIT 20;

-- Check if newer categories exist but have no products
SELECT 
  c.id,
  c.name,
  c.created_at
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE p.id IS NULL
ORDER BY c.created_at DESC;
