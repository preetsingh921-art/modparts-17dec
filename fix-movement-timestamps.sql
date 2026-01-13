-- Migration: Add movement timestamps and fix user warehouse assignment
-- Run this in your Neon database console

-- 1. Add shipped_at and received_at columns to inventory_movements
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;

-- 2. Update existing records: set shipped_at from created_at where status is not pending
UPDATE inventory_movements 
SET shipped_at = created_at 
WHERE shipped_at IS NULL AND status != 'pending';

-- 3. Set received_at from scanned_at for completed movements
UPDATE inventory_movements 
SET received_at = scanned_at 
WHERE received_at IS NULL AND status = 'completed' AND scanned_at IS NOT NULL;

-- 4. Verify the warehouse_id column exists in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS warehouse_id BIGINT REFERENCES warehouses(id);

-- 5. Check current admin's warehouse assignment
SELECT u.id, u.email, u.warehouse_id, w.name as warehouse_name 
FROM users u 
LEFT JOIN warehouses w ON u.warehouse_id = w.id 
WHERE u.role = 'admin';

-- 6. Fix: Assign warehouse "India Warehouse1" to admin charan117@gmail.com
-- First find the warehouse ID
SELECT id, name FROM warehouses WHERE name ILIKE '%India%';

-- Then update the user (replace WAREHOUSE_ID with actual ID from above query)
-- UPDATE users SET warehouse_id = WAREHOUSE_ID WHERE email = 'charan117@gmail.com';

-- 7. Verify the fix
SELECT email, warehouse_id FROM users WHERE email = 'charan117@gmail.com';
