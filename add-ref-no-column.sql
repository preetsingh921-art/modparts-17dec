-- Migration: Add ref_no column to products table
-- Purpose: Store the Ref No from scraped RD350 parts catalogs
-- Run this against your Neon database

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ref_no VARCHAR(10);

-- Optional: Add an index for fast lookups by ref_no
CREATE INDEX IF NOT EXISTS idx_products_ref_no ON public.products(ref_no);

-- Also include ref_no in the search so barcode scanner / search can find by ref_no
COMMENT ON COLUMN public.products.ref_no IS 'Reference number from parts catalog (e.g. RD350 parts list)';
