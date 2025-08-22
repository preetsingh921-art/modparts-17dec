-- Add Google OAuth fields to users table
-- Run this in your Supabase SQL editor

-- Add google_id column for storing Google user ID
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Add auth_provider column to track how user registered
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email' 
CHECK (auth_provider IN ('email', 'google'));

-- Add index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add index for auth provider
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Update existing users to have email auth provider
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID for users who signed up with Google';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: email (traditional) or google (OAuth)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('google_id', 'auth_provider')
ORDER BY column_name;
