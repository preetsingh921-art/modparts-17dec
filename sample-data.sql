-- ===========================================
-- SAMPLE DATA FOR MODPARTS NEON DATABASE
-- Execute this SQL in your Neon console
-- ===========================================

-- ===========================================
-- 1. CATEGORIES (Vintage Motorcycle Parts)
-- ===========================================
INSERT INTO categories (name, description) VALUES
('Engine Parts', 'Vintage motorcycle engine components including pistons, cylinders, gaskets, and crankcases'),
('Electrical', 'Points, condensers, coils, regulators, wiring harnesses, and lighting components'),
('Brakes', 'Brake shoes, drums, cables, levers, and master cylinders for classic bikes'),
('Suspension', 'Fork tubes, springs, shocks, and steering components'),
('Exhaust', 'Mufflers, headers, exhaust pipes, and mounting hardware'),
('Transmission', 'Gearbox parts, clutch plates, cables, and shift mechanisms'),
('Fuel System', 'Carburetors, petcocks, fuel lines, and tank components'),
('Body & Frame', 'Fenders, tanks, seats, side covers, and frame hardware'),
('Wheels & Tires', 'Rims, spokes, hubs, and vintage tire options'),
('Fasteners & Hardware', 'Bolts, nuts, clips, and specialty fasteners')
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 2. SAMPLE USERS (Matches actual schema)
-- Password for all: password123 (bcrypt hashed)
-- ===========================================
INSERT INTO users (email, password, first_name, last_name, role, is_approved, phone, address, city, state, zip_code, email_verified) VALUES
('admin@sardaarji.com', '$2a$10$xVWsV/vy6EmB8VLhbzj8vOqJy2QXYZ9wM3kq7J3NvJ3x3Q3x3Q3xK', 'Admin', 'User', 'admin', true, '+91 98765 43210', '123 Workshop Lane', 'Chandigarh', 'Punjab', '160001', true),
('john@example.com', '$2a$10$xVWsV/vy6EmB8VLhbzj8vOqJy2QXYZ9wM3kq7J3NvJ3x3Q3x3Q3xK', 'John', 'Singh', 'customer', true, '+91 87654 32109', '456 Rider Street', 'Amritsar', 'Punjab', '143001', true),
('preet@example.com', '$2a$10$xVWsV/vy6EmB8VLhbzj8vOqJy2QXYZ9wM3kq7J3NvJ3x3Q3x3Q3xK', 'Preet', 'Kaur', 'customer', true, '+91 76543 21098', '789 Classic Ave', 'Ludhiana', 'Punjab', '141001', true),
('raj@example.com', '$2a$10$xVWsV/vy6EmB8VLhbzj8vOqJy2QXYZ9wM3kq7J3NvJ3x3Q3x3Q3xK', 'Raj', 'Kumar', 'customer', false, '+91 65432 10987', '321 Vintage Road', 'Delhi', 'Delhi', '110001', false)
ON CONFLICT (email) DO NOTHING;

-- ===========================================
-- 3. SAMPLE PRODUCTS (Vintage Motorcycle Parts)
-- Valid condition_status values: 'New', 'Used - Like New', 'Used - Good', 'Used - Fair'
-- ===========================================
INSERT INTO products (name, description, part_number, barcode, condition_status, price, quantity, category_id, image_url) VALUES
-- Engine Parts (category_id = 1)
('Royal Enfield Bullet 350 Piston Kit', 'Complete piston kit with rings and gudgeon pin for 1960s Bullet 350. Bore size: STD.', 'RE-PK-350-STD', 'MP-1001-RE350', 'New', 2500.00, 15, 1, NULL),
('BSA A65 Cylinder Head Gasket Set', 'Complete gasket set for BSA A65 Lightning/Thunderbolt 1966-1972.', 'BSA-GS-A65', 'MP-1002-BSAA65', 'New', 1800.00, 8, 1, NULL),
('Norton Commando Camshaft', 'Original Norton Commando 750/850 camshaft. Good condition.', 'NOR-CAM-750', 'MP-1003-NORCAM', 'Used - Good', 8500.00, 2, 1, NULL),
('Triumph Bonneville T120 Connecting Rods', 'Pair of connecting rods for Triumph T120/TR6 1963-1970.', 'TRI-CR-T120', 'MP-1004-TRICR', 'Used - Like New', 12000.00, 3, 1, NULL),
-- Electrical (category_id = 2)
('Lucas K2F Magneto Points Set', 'NOS Lucas points for K2F magneto. Fits Triumph, BSA, Norton twins.', 'LUC-PTS-K2F', 'MP-2001-LUCPTS', 'New', 950.00, 20, 2, NULL),
('6V Rectifier for Vintage British Bikes', 'Solid state 6V rectifier to replace original selenium units.', 'VSS-REC-6V', 'MP-2002-REC6V', 'New', 650.00, 25, 2, NULL),
('Wiring Harness - Royal Enfield Continental GT', 'Complete reproduction wiring harness 1965-1967.', 'RE-WH-CGT', 'MP-2003-REWH', 'New', 4500.00, 5, 2, NULL),
('Lucas Altette Horn 12V', 'Refurbished Lucas Altette horn. Replated and tested.', 'LUC-HRN-ALT', 'MP-2004-LUCHRN', 'Used - Like New', 2200.00, 7, 2, NULL),
-- Brakes (category_id = 3)
('Brake Shoes - Triumph/BSA 8 inch Full Width Hub', 'Premium brake shoe set for 8 inch TLS front hub.', 'BRK-SH-8TLS', 'MP-3001-BRKSH', 'New', 1600.00, 30, 3, NULL),
('Front Brake Cable - Norton Commando', 'Reproduction front brake cable for Norton Commando.', 'NOR-BRC-FRT', 'MP-3002-NORBRC', 'New', 450.00, 18, 3, NULL),
-- Suspension (category_id = 4)
('Girling Rear Shocks - 325mm', 'New reproduction Girling-style rear shocks. 325mm.', 'GIR-SHK-325', 'MP-4001-GIRSHK', 'New', 5500.00, 10, 4, NULL),
('Fork Stanchions - BSA A10/A65', 'Rechromed fork stanchions for BSA A10 and A65.', 'BSA-FS-A10', 'MP-4002-BSAFS', 'Used - Like New', 7800.00, 4, 4, NULL),
-- Exhaust (category_id = 5)
('Silencer - Triumph Bonneville Peashooter Style', 'Reproduction peashooter silencer for T120/TR6.', 'TRI-SIL-PS', 'MP-5001-TRISIL', 'New', 3200.00, 12, 5, NULL),
('Exhaust Pipes - Norton Dominator 88/99', 'Complete exhaust pipe set for Dominator twins.', 'NOR-EXH-DOM', 'MP-5002-NOREXH', 'New', 6500.00, 6, 5, NULL),
-- Transmission (category_id = 6)
('Clutch Plates - Royal Enfield Bullet', 'Complete clutch plate set for Bullet 350/500.', 'RE-CLP-BUL', 'MP-6001-RECLP', 'New', 1100.00, 22, 6, NULL),
('Gearbox Sprocket - 17T Triumph 4-Speed', 'NOS gearbox sprocket 17 tooth for Triumph 4-speed.', 'TRI-GSP-17', 'MP-6002-TRIGSP', 'New', 800.00, 9, 6, NULL),
-- Fuel System (category_id = 7)
('Amal Monobloc 376 Carburetor', 'Rebuilt Amal Monobloc 376 carburetor. Ready to fit.', 'AMAL-376-RB', 'MP-7001-AMAL', 'Used - Like New', 4800.00, 5, 7, NULL),
('Petcock - BSA/Triumph', 'Reproduction petcock with reserve. Chrome plated.', 'BSA-PET-CHR', 'MP-7002-BSAPET', 'New', 750.00, 15, 7, NULL),
-- Body & Frame (category_id = 8)
('Tank Badges - Royal Enfield Script', 'Pair of reproduction tank badges with gold/chrome finish.', 'RE-TKB-SCR', 'MP-8001-RETKB', 'New', 1200.00, 20, 8, NULL),
('Seat - Triumph Tiger Cub', 'Recovered solo seat for Triumph Tiger Cub.', 'TRI-ST-CUB', 'MP-8002-TRIST', 'Used - Like New', 3500.00, 3, 8, NULL)
ON CONFLICT DO NOTHING;

-- ===========================================
-- 4. SAMPLE ORDERS
-- Valid status values: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
-- ===========================================
DO $$
DECLARE
    user_john_id BIGINT;
    user_preet_id BIGINT;
BEGIN
    SELECT id INTO user_john_id FROM users WHERE email = 'john@example.com';
    SELECT id INTO user_preet_id FROM users WHERE email = 'preet@example.com';
    
    IF user_john_id IS NOT NULL THEN
        INSERT INTO orders (user_id, status, total_amount, shipping_address, payment_method) 
        VALUES (user_john_id, 'delivered', 5950.00, '456 Rider Street, Amritsar, Punjab 143001', 'card');
        
        INSERT INTO orders (user_id, status, total_amount, shipping_address, payment_method) 
        VALUES (user_john_id, 'processing', 8500.00, '456 Rider Street, Amritsar, Punjab 143001', 'upi');
    END IF;
    
    IF user_preet_id IS NOT NULL THEN
        INSERT INTO orders (user_id, status, total_amount, shipping_address, payment_method) 
        VALUES (user_preet_id, 'shipped', 6700.00, '789 Classic Ave, Ludhiana, Punjab 141001', 'cod');
    END IF;
END $$;


-- ===========================================
-- 5. SAMPLE ORDER ITEMS
-- ===========================================
DO $$
DECLARE
    order1_id BIGINT;
    order2_id BIGINT;
    order3_id BIGINT;
    prod1_id BIGINT;
    prod2_id BIGINT;
    prod3_id BIGINT;
    prod4_id BIGINT;
BEGIN
    SELECT id INTO order1_id FROM orders WHERE status = 'delivered' LIMIT 1;
    SELECT id INTO order2_id FROM orders WHERE status = 'processing' LIMIT 1;
    SELECT id INTO order3_id FROM orders WHERE status = 'shipped' LIMIT 1;
    
    SELECT id INTO prod1_id FROM products WHERE part_number = 'RE-PK-350-STD';
    SELECT id INTO prod2_id FROM products WHERE part_number = 'LUC-PTS-K2F';
    SELECT id INTO prod3_id FROM products WHERE part_number = 'NOR-CAM-750';
    SELECT id INTO prod4_id FROM products WHERE part_number = 'GIR-SHK-325';
    
    IF order1_id IS NOT NULL AND prod1_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (order1_id, prod1_id, 2, 2500.00);
    END IF;
    IF order1_id IS NOT NULL AND prod2_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (order1_id, prod2_id, 1, 950.00);
    END IF;
    IF order2_id IS NOT NULL AND prod3_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (order2_id, prod3_id, 1, 8500.00);
    END IF;
    IF order3_id IS NOT NULL AND prod4_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (order3_id, prod4_id, 1, 5500.00);
    END IF;
END $$;

-- ===========================================
-- 6. SAMPLE PRODUCT REVIEWS
-- ===========================================
DO $$
DECLARE
    user_john_id BIGINT;
    user_preet_id BIGINT;
    prod1_id BIGINT;
    prod2_id BIGINT;
BEGIN
    SELECT id INTO user_john_id FROM users WHERE email = 'john@example.com';
    SELECT id INTO user_preet_id FROM users WHERE email = 'preet@example.com';
    SELECT id INTO prod1_id FROM products WHERE part_number = 'RE-PK-350-STD';
    SELECT id INTO prod2_id FROM products WHERE part_number = 'LUC-PTS-K2F';
    
    IF user_john_id IS NOT NULL AND prod1_id IS NOT NULL THEN
        INSERT INTO product_reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
        VALUES (prod1_id, user_john_id, 5, 'Excellent quality piston kit', 'Perfect fit for my 1965 Bullet. Highly recommended!', true);
    END IF;
    
    IF user_preet_id IS NOT NULL AND prod2_id IS NOT NULL THEN
        INSERT INTO product_reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
        VALUES (prod2_id, user_preet_id, 4, 'Good NOS points', 'Original Lucas quality. Arrived well packaged.', true);
    END IF;
END $$;

-- ===========================================
-- VERIFY DATA
-- ===========================================
SELECT 'categories' as table_name, COUNT(*) as count FROM categories
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'product_reviews', COUNT(*) FROM product_reviews;
