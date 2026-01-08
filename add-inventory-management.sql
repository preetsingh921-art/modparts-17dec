-- =====================================================
-- Inventory Management System - Database Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Add new fields to products table
-- =====================================================

-- Add part_number field (for OEM/manufacturer part numbers like 278-11631-00)
ALTER TABLE products ADD COLUMN IF NOT EXISTS part_number VARCHAR(50);

-- Add barcode field (auto-generated or can use part_number)
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

-- Add warehouse tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_id INT;

-- Add bin location for inventory organization
ALTER TABLE products ADD COLUMN IF NOT EXISTS bin_number VARCHAR(20);

-- Create unique index on barcode (allows NULL but unique when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Create index on part_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_part_number ON products(part_number);

-- =====================================================
-- STEP 2: Create warehouses table
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    country VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default warehouses
INSERT INTO warehouses (name, location, country) VALUES 
    ('Canada Warehouse', 'Canada', 'CA'),
    ('India Warehouse', 'India', 'IN')
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 3: Create bins table
-- =====================================================

CREATE TABLE IF NOT EXISTS bins (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
    bin_number VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    capacity INT DEFAULT 100,
    current_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(warehouse_id, bin_number)
);

-- =====================================================
-- STEP 4: Create inventory_movements table
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    from_warehouse_id BIGINT REFERENCES warehouses(id),
    to_warehouse_id BIGINT REFERENCES warehouses(id),
    from_bin VARCHAR(20),
    to_bin VARCHAR(20),
    quantity INT NOT NULL DEFAULT 1,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('transfer', 'receive', 'ship', 'sold', 'adjustment')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    notes TEXT,
    scanned_at TIMESTAMP WITH TIME ZONE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_status ON inventory_movements(status);
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);

-- =====================================================
-- STEP 5: Add foreign key to products for warehouse
-- =====================================================

ALTER TABLE products 
ADD CONSTRAINT fk_products_warehouse 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 6: Create updated_at triggers
-- =====================================================

-- Trigger for warehouses
CREATE TRIGGER update_warehouses_updated_at 
    BEFORE UPDATE ON warehouses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for bins
CREATE TRIGGER update_bins_updated_at 
    BEFORE UPDATE ON bins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for inventory_movements
CREATE TRIGGER update_inventory_movements_updated_at 
    BEFORE UPDATE ON inventory_movements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION: Check tables were created
-- =====================================================

-- Run this to verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
