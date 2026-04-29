-- ============================================================
-- Layer 1 & 2 Migration: Geo-IP Stock Routing + Transfer Pipeline
-- Run this in your Neon database console
-- ============================================================

-- ==================== LAYER 1 ====================

-- 1. Add HS code to products (for customs/compliance)
ALTER TABLE products ADD COLUMN IF NOT EXISTS hs_code VARCHAR(20);

-- 2. Ensure warehouses have country set (verify existing data)
-- UPDATE warehouses SET country = 'IND' WHERE name ILIKE '%india%';
-- UPDATE warehouses SET country = 'CAN' WHERE name ILIKE '%canada%';

-- ==================== LAYER 2 ====================

-- 3. Add transfer pipeline fields to inventory_movements
ALTER TABLE inventory_movements 
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customs_status VARCHAR(30) DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS customs_cleared_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS from_bin_number VARCHAR(20);

-- 4. Drop old status constraint if exists, add expanded one
DO $$
BEGIN
  -- Try to drop existing constraint
  ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS movements_status_check;
  ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if constraint doesn't exist
END $$;

-- Note: If you want to enforce statuses via constraint, uncomment below:
-- ALTER TABLE inventory_movements ADD CONSTRAINT movements_status_check 
--   CHECK (status IN ('pending', 'picked', 'packed', 'customs_review', 'in_transit', 'arrived', 'received', 'completed', 'cancelled'));

-- 5. Verify changes
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'inventory_movements' 
ORDER BY ordinal_position;
