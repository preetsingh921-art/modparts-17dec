<?php
class Product
{
    private $conn;
    private $table_name = "products";

    public $id;
    public $category_id;
    public $name;
    public $description;
    public $part_number;
    public $barcode;
    public $condition_status;
    public $price;
    public $quantity;
    public $image_url;
    public $warehouse_id;
    public $bin_number;
    public $created_at;
    public $updated_at;
    public $category_name;
    public $warehouse_name;

    public function __construct($db)
    {
        $this->conn = $db;

        // Ensure the products table exists
        $this->ensureTableExists();
    }

    // Ensure the products table exists
    private function ensureTableExists()
    {
        try {
            // Check if table exists
            $tableExists = false;
            try {
                $checkTable = "SELECT 1 FROM " . $this->table_name . " LIMIT 1";
                $this->conn->query($checkTable);
                $tableExists = true;
                error_log("Product: Table already exists");
            } catch (PDOException $e) {
                $tableExists = false;
                error_log("Product: Table does not exist, will create it");
            }

            // Only create the table if it doesn't exist
            if (!$tableExists) {
                // Create the table
                $createTable = "CREATE TABLE IF NOT EXISTS " . $this->table_name . " (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    category_id INT,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    condition_status VARCHAR(50),
                    price DECIMAL(10,2) NOT NULL,
                    quantity INT NOT NULL DEFAULT 0,
                    image_url VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )";

                $result = $this->conn->exec($createTable);
                error_log("Product: Table creation result: " . ($result !== false ? "Success" : "Failed"));

                // Check if the table is empty
                $checkEmpty = "SELECT COUNT(*) as count FROM " . $this->table_name;
                $stmt = $this->conn->prepare($checkEmpty);
                $stmt->execute();
                $row = $stmt->fetch(PDO::FETCH_ASSOC);

                // Only insert test data if the table is empty
                if ($row['count'] == 0) {
                    error_log("Product: Table is empty, inserting test data");

                    // Insert test products for development
                    $testProducts = [
                        [
                            'category_id' => 1,
                            'name' => 'Yamaha RD350 Carburetor',
                            'description' => 'Original carburetor for Yamaha RD350',
                            'condition_status' => 'New',
                            'price' => 199.99,
                            'quantity' => 10,
                            'image_url' => 'images/products/carburetor.jpg'
                        ],
                        [
                            'category_id' => 1,
                            'name' => 'Yamaha RD400 Exhaust Pipe',
                            'description' => 'Chrome exhaust pipe for Yamaha RD400',
                            'condition_status' => 'New',
                            'price' => 149.99,
                            'quantity' => 5,
                            'image_url' => 'images/products/exhaust.jpg'
                        ],
                        [
                            'category_id' => 2,
                            'name' => 'Yamaha RD250 Engine Gasket Set',
                            'description' => 'Complete engine gasket set for Yamaha RD250',
                            'condition_status' => 'New',
                            'price' => 49.99,
                            'quantity' => 20,
                            'image_url' => 'images/products/gasket.jpg'
                        ]
                    ];

                    foreach ($testProducts as $product) {
                        $insertQuery = "INSERT INTO " . $this->table_name . "
                            (category_id, name, description, condition_status, price, quantity, image_url)
                            VALUES (?, ?, ?, ?, ?, ?, ?)";

                        $stmt = $this->conn->prepare($insertQuery);
                        $stmt->bindParam(1, $product['category_id']);
                        $stmt->bindParam(2, $product['name']);
                        $stmt->bindParam(3, $product['description']);
                        $stmt->bindParam(4, $product['condition_status']);
                        $stmt->bindParam(5, $product['price']);
                        $stmt->bindParam(6, $product['quantity']);
                        $stmt->bindParam(7, $product['image_url']);

                        $stmt->execute();
                    }

                    error_log("Product: Test products inserted");
                }
            }
        } catch (PDOException $e) {
            error_log("Product: Error checking/creating table: " . $e->getMessage());
        }
    }

    // Read all products
    public function read()
    {
        $query = "SELECT c.name as category_name, w.name as warehouse_name,
                         p.id, p.category_id, p.name, p.description, p.part_number, p.barcode,
                         p.condition_status, p.price, p.quantity, p.image_url,
                         p.warehouse_id, p.bin_number, p.created_at, p.updated_at
                FROM " . $this->table_name . " p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN warehouses w ON p.warehouse_id = w.id
                ORDER BY p.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt;
    }

    // Read products by category
    public function readByCategory()
    {
        $query = "SELECT c.name as category_name, w.name as warehouse_name,
                         p.id, p.category_id, p.name, p.description, p.part_number, p.barcode,
                         p.condition_status, p.price, p.quantity, p.image_url,
                         p.warehouse_id, p.bin_number, p.created_at, p.updated_at
                FROM " . $this->table_name . " p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN warehouses w ON p.warehouse_id = w.id
                WHERE p.category_id = ?
                ORDER BY p.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->category_id);
        $stmt->execute();

        return $stmt;
    }

    // Read single product
    public function readOne()
    {
        $query = "SELECT c.name as category_name, w.name as warehouse_name,
                         p.id, p.category_id, p.name, p.description, p.part_number, p.barcode,
                         p.condition_status, p.price, p.quantity, p.image_url,
                         p.warehouse_id, p.bin_number, p.created_at, p.updated_at
                FROM " . $this->table_name . " p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN warehouses w ON p.warehouse_id = w.id
                WHERE p.id = ?
                LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->id = $row['id'];
            $this->category_id = $row['category_id'];
            $this->name = $row['name'];
            $this->description = $row['description'];
            $this->part_number = $row['part_number'];
            $this->barcode = $row['barcode'];
            $this->condition_status = $row['condition_status'];
            $this->price = $row['price'];
            $this->quantity = $row['quantity'];
            $this->image_url = $row['image_url'];
            $this->warehouse_id = $row['warehouse_id'];
            $this->bin_number = $row['bin_number'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            $this->category_name = $row['category_name'];
            $this->warehouse_name = $row['warehouse_name'];
            return true;
        }

        return false;
    }

    // Read product by barcode
    public function readByBarcode($barcode)
    {
        $query = "SELECT c.name as category_name, w.name as warehouse_name,
                         p.id, p.category_id, p.name, p.description, p.part_number, p.barcode,
                         p.condition_status, p.price, p.quantity, p.image_url,
                         p.warehouse_id, p.bin_number, p.created_at, p.updated_at
                FROM " . $this->table_name . " p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN warehouses w ON p.warehouse_id = w.id
                WHERE p.barcode = ?
                LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $barcode);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Generate barcode for product
    public function generateBarcode()
    {
        // Generate barcode based on part_number or product ID
        if (!empty($this->part_number)) {
            $this->barcode = strtoupper(str_replace([' ', '-'], '', $this->part_number));
        } else {
            $this->barcode = 'MP-' . str_pad($this->id, 6, '0', STR_PAD_LEFT);
        }
        return $this->barcode;
    }

    // Update barcode for a product
    public function updateBarcode()
    {
        $query = "UPDATE " . $this->table_name . " SET barcode = :barcode WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':barcode', $this->barcode);
        $stmt->bindParam(':id', $this->id);
        return $stmt->execute();
    }

    // Update warehouse and bin location
    public function updateLocation()
    {
        $query = "UPDATE " . $this->table_name . " 
                  SET warehouse_id = :warehouse_id, bin_number = :bin_number 
                  WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':warehouse_id', $this->warehouse_id);
        $stmt->bindParam(':bin_number', $this->bin_number);
        $stmt->bindParam(':id', $this->id);
        return $stmt->execute();
    }

    // Create product
    public function create()
    {
        $query = "INSERT INTO " . $this->table_name . "
                SET
                    category_id = :category_id,
                    name = :name,
                    description = :description,
                    condition_status = :condition_status,
                    price = :price,
                    quantity = :quantity,
                    image_url = :image_url";

        $stmt = $this->conn->prepare($query);

        // Sanitize input
        $this->category_id = htmlspecialchars(strip_tags($this->category_id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->condition_status = htmlspecialchars(strip_tags($this->condition_status));
        $this->price = htmlspecialchars(strip_tags($this->price));
        $this->quantity = htmlspecialchars(strip_tags($this->quantity));
        $this->image_url = htmlspecialchars(strip_tags($this->image_url));

        // Bind values
        $stmt->bindParam(":category_id", $this->category_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":condition_status", $this->condition_status);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindParam(":quantity", $this->quantity);
        $stmt->bindParam(":image_url", $this->image_url);

        // Execute query
        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Update product
    public function update()
    {
        $query = "UPDATE " . $this->table_name . "
                SET
                    category_id = :category_id,
                    name = :name,
                    description = :description,
                    condition_status = :condition_status,
                    price = :price,
                    quantity = :quantity,
                    image_url = :image_url,
                    part_number = :part_number,
                    barcode = :barcode
                WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        // Sanitize input
        $this->category_id = htmlspecialchars(strip_tags($this->category_id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->condition_status = htmlspecialchars(strip_tags($this->condition_status));
        $this->price = htmlspecialchars(strip_tags($this->price));
        $this->quantity = htmlspecialchars(strip_tags($this->quantity));
        $this->image_url = htmlspecialchars(strip_tags($this->image_url ?? ''));
        $this->part_number = $this->part_number ? htmlspecialchars(strip_tags($this->part_number)) : null;
        $this->barcode = $this->barcode ? htmlspecialchars(strip_tags($this->barcode)) : null;
        $this->id = htmlspecialchars(strip_tags($this->id));

        // Bind values
        $stmt->bindParam(":category_id", $this->category_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":condition_status", $this->condition_status);
        $stmt->bindParam(":price", $this->price);
        $stmt->bindParam(":quantity", $this->quantity);
        $stmt->bindParam(":image_url", $this->image_url);
        $stmt->bindParam(":part_number", $this->part_number);
        $stmt->bindParam(":barcode", $this->barcode);
        $stmt->bindParam(":id", $this->id);

        // Execute query
        try {
            if ($stmt->execute()) {
                return true;
            }
            // Log query error
            error_log("[PRODUCT MODEL UPDATE ERROR] Query failed for ID: " . $this->id);
            error_log("[PRODUCT MODEL UPDATE ERROR] Error info: " . json_encode($stmt->errorInfo()));
            return false;
        } catch (PDOException $e) {
            error_log("[PRODUCT MODEL UPDATE EXCEPTION] " . $e->getMessage());
            return false;
        }
    }

    // Delete product
    public function delete()
    {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);

        // Execute query
        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Search products
    public function search($keywords)
    {
        $query = "SELECT c.name as category_name, p.id, p.category_id, p.name, p.description,
                         p.condition_status, p.price, p.quantity, p.image_url, p.created_at, p.updated_at
                FROM " . $this->table_name . " p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?
                ORDER BY p.created_at DESC";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $keywords = htmlspecialchars(strip_tags($keywords));
        $keywords = "%{$keywords}%";

        // Bind
        $stmt->bindParam(1, $keywords);
        $stmt->bindParam(2, $keywords);
        $stmt->bindParam(3, $keywords);

        // Execute query
        $stmt->execute();

        return $stmt;
    }

    // Read products with pagination
    public function readPaging($from_record_num, $records_per_page)
    {
        $query = "SELECT c.name as category_name, p.id, p.category_id, p.name, p.description,
                         p.condition_status, p.price, p.quantity, p.image_url, p.created_at, p.updated_at
                FROM " . $this->table_name . " p
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.created_at DESC
                LIMIT ?, ?";

        $stmt = $this->conn->prepare($query);

        // Bind variables
        $stmt->bindParam(1, $from_record_num, PDO::PARAM_INT);
        $stmt->bindParam(2, $records_per_page, PDO::PARAM_INT);

        // Execute query
        $stmt->execute();

        return $stmt;
    }

    // Used for paging products
    public function count()
    {
        $query = "SELECT COUNT(*) as total_rows FROM " . $this->table_name;

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row['total_rows'];
    }
}
?>