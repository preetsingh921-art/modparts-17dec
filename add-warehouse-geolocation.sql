-- Add geolocation columns to warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Update Samuel Teitel Warehouse with Toronto coordinates
-- 2 Samuel Teitel Court, Scarborough, ON M1X 1S7, Canada
-- Approximate coordinates: 43.7615, -79.2315
UPDATE warehouses 
SET latitude = 43.7615, longitude = -79.2315
WHERE name LIKE '%Samuel%' OR location LIKE '%Samuel%';

-- If you have other warehouses, update them with their coordinates:
-- Example for India warehouse (Delhi coordinates)
-- UPDATE warehouses SET latitude = 28.6139, longitude = 77.2090 WHERE name LIKE '%India%' OR location LIKE '%Delhi%';

-- Verify the update
SELECT id, name, location, latitude, longitude FROM warehouses;
