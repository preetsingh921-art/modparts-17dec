-- Add password reset fields to users table
-- Run this in your Supabase SQL editor

-- Add reset_token column for storing password reset tokens
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token TEXT;

-- Add reset_token_expiry column for token expiration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

-- Add index for faster reset token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Add index for reset token expiry cleanup
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry ON users(reset_token_expiry);

-- Add comment for documentation
COMMENT ON COLUMN users.reset_token IS 'Secure token for password reset functionality';
COMMENT ON COLUMN users.reset_token_expiry IS 'Expiration timestamp for reset token (1 hour validity)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_token', 'reset_token_expiry')
ORDER BY column_name;
