-- Migration: Add superadmin role
-- This creates a superadmin user who can see ALL products and orders across all warehouses
-- Regular admins only see products/orders scoped to their assigned warehouse

-- 1. Update the user role to 'superadmin' for the designated email
UPDATE users 
SET role = 'superadmin' 
WHERE email = 'preet.singh921@gmail.com';

-- 2. If the user doesn't exist, create them with superadmin role
-- (The password hash is for 'TempPassword123!' - should be changed on first login)
INSERT INTO users (email, password, first_name, last_name, role, is_approved, email_verified)
SELECT 
    'preet.singh921@gmail.com',
    '$2a$10$placeholder_hash_change_me',
    'Preet',
    'Singh',
    'superadmin',
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'preet.singh921@gmail.com'
);

-- 3. Verify the superadmin was created/updated
SELECT id, email, role, warehouse_id, first_name, last_name 
FROM users 
WHERE email = 'preet.singh921@gmail.com';
