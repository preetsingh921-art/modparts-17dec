-- Migration: Add missing columns for inventory movements and customs tracking
-- Run in Neon Database console if needed

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS received_by BIGINT REFERENCES users(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS hs_code VARCHAR(20);

-- Ensure user status and approval columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending_approval', 'active', 'rejected', 'suspended'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_reason TEXT;
