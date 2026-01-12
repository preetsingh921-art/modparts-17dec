-- =====================================================
-- Complete Warehouse Table Migration
-- Adds all missing columns for full warehouse management
-- =====================================================

-- Add all missing columns to warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS zip VARCHAR(20);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Rename is_active to status if needed (or add status column)
-- ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update existing Samuel Teitel warehouse with full details
UPDATE warehouses 
SET 
    code = 'WH-MAIN',
    address = '2 Samuel Teitel Court',
    city = 'Scarborough',
    state = 'ON',
    zip = 'M1X 1S7',
    latitude = 43.7615,
    longitude = -79.2315
WHERE name LIKE '%Samuel%' OR location LIKE '%Samuel%';

-- Verify the changes
SELECT 
    id, name, code, address, city, state, zip, 
    phone, latitude, longitude, is_active, location
FROM warehouses;

-- Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'warehouses' 
ORDER BY ordinal_position;
