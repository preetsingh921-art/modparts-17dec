-- COMPREHENSIVE DATABASE FIX
-- Run this SQL to fix all missing tables and columns

-- =============================================
-- 1. FIX USERS TABLE (for user-approval)
-- =============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approval_reason TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- =============================================
-- 2. CREATE WISHLIST_ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Create indexes for wishlist queries
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist_items(product_id);

-- =============================================
-- 3. FIX DUPLICATE CATEGORIES
-- =============================================

-- First, consolidate all products to original (lowest ID) categories
UPDATE products
SET category_id = subq.original_id
FROM (
  SELECT 
    c.id as current_id,
    (SELECT MIN(id) FROM categories c2 WHERE c2.name = c.name) as original_id
  FROM categories c
  WHERE c.id != (SELECT MIN(id) FROM categories c3 WHERE c3.name = c.name)
) subq
WHERE products.category_id = subq.current_id;

-- Then delete duplicate categories (keep only lowest ID for each name)
DELETE FROM categories
WHERE id NOT IN (
  SELECT MIN(id)
  FROM categories
  GROUP BY name
);

-- =============================================
-- 4. VERIFY FIXES
-- =============================================

-- Check users columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('status', 'approval_reason', 'approved_at');

-- Check wishlist_items table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'wishlist_items'
) as wishlist_table_exists;

-- Check categories after cleanup
SELECT 
  c.id,
  c.name,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
