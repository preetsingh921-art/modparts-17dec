-- Add quantity column to inventory_movements table
-- This column stores how many units are being transferred in each movement

-- 1. Add quantity column if it doesn't exist
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- 2. Update existing records to have quantity = 1 if null
UPDATE inventory_movements SET quantity = 1 WHERE quantity IS NULL;

-- 3. Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inventory_movements' AND column_name = 'quantity';
