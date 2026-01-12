-- =====================================================
-- Admin Warehouse Assignment & Notifications
-- =====================================================

-- Add warehouse_id to users for admin assignment
ALTER TABLE users ADD COLUMN IF NOT EXISTS warehouse_id BIGINT REFERENCES warehouses(id);

-- Create notifications table for transfer alerts
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Example: Assign an admin to a warehouse
-- UPDATE users SET warehouse_id = (SELECT id FROM warehouses WHERE name LIKE '%Samuel%') WHERE email = 'admin@example.com';

-- View admins with warehouse assignments
SELECT u.id, u.email, u.role, w.name as warehouse_name 
FROM users u 
LEFT JOIN warehouses w ON u.warehouse_id = w.id 
WHERE u.role = 'admin';
