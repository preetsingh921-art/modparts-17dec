-- Add missing columns for user approval system
-- Run this in your database to fix the "Internal Error" on the Approval page

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS approval_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Create an index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('approval_reason', 'approved_at');
