-- Fix duplicate categories issue
-- This will consolidate all products to the original category IDs and delete duplicates

-- Step 1: Identify the original (lowest ID) category for each name
WITH original_categories AS (
  SELECT name, MIN(id) as original_id
  FROM categories
  GROUP BY name
)
SELECT 
  c.id,
  c.name,
  oc.original_id,
  CASE WHEN c.id = oc.original_id THEN 'KEEP' ELSE 'DELETE' END as action
FROM categories c
JOIN original_categories oc ON c.name = oc.name
ORDER BY c.name, c.id;

-- Step 2: Consolidate products to original categories
-- This updates products that are assigned to duplicate category IDs
-- For each category name, move all products to the lowest ID

-- Preview what will be updated:
SELECT 
  p.id,
  p.name as product_name,
  p.category_id as current_category_id,
  c.name as current_category_name,
  (SELECT MIN(id) FROM categories WHERE name = c.name) as new_category_id
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.category_id != (SELECT MIN(id) FROM categories WHERE name = c.name)
ORDER BY c.name, p.name;

-- Actual update (RUN THIS AFTER REVIEWING PREVIEW):
UPDATE products
SET category_id = (
  SELECT MIN(id) 
  FROM categories 
  WHERE name = (
    SELECT name 
    FROM categories 
    WHERE id = products.category_id
  )
)
WHERE category_id IN (
  SELECT c.id 
  FROM categories c
  WHERE c.id != (SELECT MIN(id) FROM categories WHERE name = c.name)
);

-- Step 3: Delete duplicate categories (after products are moved)
-- This deletes all category IDs except the lowest ID for each name
DELETE FROM categories
WHERE id NOT IN (
  SELECT MIN(id)
  FROM categories
  GROUP BY name
);

-- Step 4: Verify the fix
SELECT 
  c.id,
  c.name,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
