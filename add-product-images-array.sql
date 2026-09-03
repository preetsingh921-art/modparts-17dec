-- Migration: Add multi-image support to products
-- Allows products to store multiple images in a JSONB array while maintaining image_url as primary cover

ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Populate images array from existing image_url where images is empty
UPDATE products 
SET images = json_build_array(image_url)::jsonb 
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND image_url != 'nan'
  AND (images IS NULL OR images = '[]'::jsonb);
