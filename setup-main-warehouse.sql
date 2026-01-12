-- =====================================================
-- Setup Main Warehouse at Samuel Teitel Court
-- =====================================================

-- 1. Create the main warehouse
INSERT INTO warehouses (name, location, country, is_active)
VALUES (
  'Samuel Teitel Warehouse',
  '2 Samuel Teitel Court, Scarborough, M1X 1S7, Toronto',
  'Canada',
  true
);

-- 2. Get the warehouse ID and create bins
-- (Run this after the INSERT above)
DO $$
DECLARE
  wh_id INTEGER;
BEGIN
  SELECT id INTO wh_id FROM warehouses WHERE name = 'Samuel Teitel Warehouse';
  
  -- Create bins with organized naming
  INSERT INTO bins (warehouse_id, bin_number, description, capacity) VALUES
    (wh_id, 'A-01', 'Aisle A - Row 1', 100),
    (wh_id, 'A-02', 'Aisle A - Row 2', 100),
    (wh_id, 'A-03', 'Aisle A - Row 3', 100),
    (wh_id, 'B-01', 'Aisle B - Row 1', 100),
    (wh_id, 'B-02', 'Aisle B - Row 2', 100),
    (wh_id, 'B-03', 'Aisle B - Row 3', 100),
    (wh_id, 'C-01', 'Aisle C - Row 1', 100),
    (wh_id, 'C-02', 'Aisle C - Row 2', 100),
    (wh_id, 'D-01', 'Aisle D - Row 1', 150),
    (wh_id, 'D-02', 'Aisle D - Row 2', 150),
    (wh_id, 'BULK-01', 'Bulk Storage 1', 500),
    (wh_id, 'BULK-02', 'Bulk Storage 2', 500)
  ON CONFLICT DO NOTHING;
  
  -- Set this warehouse as default for all products
  UPDATE products 
  SET warehouse_id = wh_id
  WHERE warehouse_id IS NULL;
  
END $$;

-- 3. Verify results
SELECT * FROM warehouses WHERE name LIKE '%Samuel%';
SELECT * FROM bins WHERE warehouse_id = (SELECT id FROM warehouses WHERE name = 'Samuel Teitel Warehouse');
SELECT COUNT(*) as products_assigned FROM products WHERE warehouse_id IS NOT NULL;
