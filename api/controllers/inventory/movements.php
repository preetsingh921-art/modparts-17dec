<?php
// Inventory Movements API - Track transfers between warehouses
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../models/Product.php';
include_once '../../middleware/auth.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Route based on method and action
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        // Get movements (with filters)
        $product_id = $_GET['product_id'] ?? null;
        $status = $_GET['status'] ?? null;
        $movement_type = $_GET['movement_type'] ?? null;
        $from_warehouse = $_GET['from_warehouse'] ?? null;
        $to_warehouse = $_GET['to_warehouse'] ?? null;

        $query = "SELECT m.*, 
                         p.name as product_name, p.barcode, p.part_number,
                         fw.name as from_warehouse_name,
                         tw.name as to_warehouse_name,
                         u.first_name || ' ' || u.last_name as created_by_name
                  FROM inventory_movements m
                  LEFT JOIN products p ON m.product_id = p.id
                  LEFT JOIN warehouses fw ON m.from_warehouse_id = fw.id
                  LEFT JOIN warehouses tw ON m.to_warehouse_id = tw.id
                  LEFT JOIN users u ON m.created_by = u.id
                  WHERE 1=1";

        $params = array();

        if ($product_id) {
            $query .= " AND m.product_id = ?";
            $params[] = $product_id;
        }
        if ($status) {
            $query .= " AND m.status = ?";
            $params[] = $status;
        }
        if ($movement_type) {
            $query .= " AND m.movement_type = ?";
            $params[] = $movement_type;
        }
        if ($from_warehouse) {
            $query .= " AND m.from_warehouse_id = ?";
            $params[] = $from_warehouse;
        }
        if ($to_warehouse) {
            $query .= " AND m.to_warehouse_id = ?";
            $params[] = $to_warehouse;
        }

        $query .= " ORDER BY m.created_at DESC LIMIT 100";

        $stmt = $db->prepare($query);

        foreach ($params as $index => $value) {
            $stmt->bindValue($index + 1, $value);
        }

        $stmt->execute();
        $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode(array("movements" => $movements));
        break;

    case 'POST':
        // Create new movement or perform action
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        switch ($action) {
            case 'ship':
                // Ship products from Canada to India
                if (empty($data->product_ids) || !is_array($data->product_ids)) {
                    http_response_code(400);
                    echo json_encode(array("message" => "Product IDs array is required."));
                    exit;
                }

                $from_warehouse_id = $data->from_warehouse_id ?? 1; // Default: Canada
                $to_warehouse_id = $data->to_warehouse_id ?? 2; // Default: India
                $notes = $data->notes ?? null;
                $user_id = getCurrentUserId();

                $success_count = 0;
                $movements = array();

                foreach ($data->product_ids as $product_id) {
                    $query = "INSERT INTO inventory_movements 
                              (product_id, from_warehouse_id, to_warehouse_id, quantity, movement_type, status, notes, created_by)
                              VALUES (?, ?, ?, 1, 'ship', 'in_transit', ?, ?)";
                    $stmt = $db->prepare($query);
                    $stmt->bindParam(1, $product_id);
                    $stmt->bindParam(2, $from_warehouse_id);
                    $stmt->bindParam(3, $to_warehouse_id);
                    $stmt->bindParam(4, $notes);
                    $stmt->bindParam(5, $user_id);

                    if ($stmt->execute()) {
                        $success_count++;
                        $movements[] = array(
                            "movement_id" => $db->lastInsertId(),
                            "product_id" => $product_id
                        );
                    }
                }

                http_response_code(201);
                echo json_encode(array(
                    "message" => "Shipment created successfully.",
                    "shipped_count" => $success_count,
                    "movements" => $movements
                ));
                break;

            case 'receive':
                // Receive product at destination (scan and confirm)
                if (empty($data->movement_id) && empty($data->barcode)) {
                    http_response_code(400);
                    echo json_encode(array("message" => "Movement ID or barcode is required."));
                    exit;
                }

                $user_id = getCurrentUserId();
                $bin_number = $data->bin_number ?? null;

                // If barcode provided, find the movement
                if (!empty($data->barcode)) {
                    $product = new Product($db);
                    $product_data = $product->readByBarcode($data->barcode);

                    if (!$product_data) {
                        http_response_code(404);
                        echo json_encode(array("message" => "Product not found with barcode."));
                        exit;
                    }

                    // Find pending movement for this product
                    $findMovement = $db->prepare(
                        "SELECT id FROM inventory_movements 
                         WHERE product_id = ? AND status = 'in_transit' 
                         ORDER BY created_at DESC LIMIT 1"
                    );
                    $findMovement->bindParam(1, $product_data['id']);
                    $findMovement->execute();
                    $movement = $findMovement->fetch(PDO::FETCH_ASSOC);

                    if (!$movement) {
                        http_response_code(404);
                        echo json_encode(array("message" => "No pending shipment found for this product."));
                        exit;
                    }

                    $movement_id = $movement['id'];
                } else {
                    $movement_id = $data->movement_id;
                }

                // Update movement status
                $query = "UPDATE inventory_movements 
                          SET status = 'completed', to_bin = ?, scanned_at = NOW()
                          WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $bin_number);
                $stmt->bindParam(2, $movement_id);

                if ($stmt->execute()) {
                    // Get movement details to update product location
                    $getMovement = $db->prepare(
                        "SELECT product_id, to_warehouse_id FROM inventory_movements WHERE id = ?"
                    );
                    $getMovement->bindParam(1, $movement_id);
                    $getMovement->execute();
                    $movementData = $getMovement->fetch(PDO::FETCH_ASSOC);

                    // Update product's warehouse and bin
                    $updateProduct = $db->prepare(
                        "UPDATE products SET warehouse_id = ?, bin_number = ? WHERE id = ?"
                    );
                    $updateProduct->bindParam(1, $movementData['to_warehouse_id']);
                    $updateProduct->bindParam(2, $bin_number);
                    $updateProduct->bindParam(3, $movementData['product_id']);
                    $updateProduct->execute();

                    http_response_code(200);
                    echo json_encode(array(
                        "message" => "Product received successfully.",
                        "movement_id" => $movement_id,
                        "product_id" => $movementData['product_id'],
                        "bin_number" => $bin_number
                    ));
                } else {
                    http_response_code(500);
                    echo json_encode(array("message" => "Unable to update movement status."));
                }
                break;

            case 'assign-bin':
                // Assign product to a bin
                if (empty($data->product_id) || empty($data->bin_number)) {
                    http_response_code(400);
                    echo json_encode(array("message" => "Product ID and bin number are required."));
                    exit;
                }

                $warehouse_id = $data->warehouse_id ?? 2; // Default: India

                $query = "UPDATE products SET warehouse_id = ?, bin_number = ? WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->bindParam(1, $warehouse_id);
                $stmt->bindParam(2, $data->bin_number);
                $stmt->bindParam(3, $data->product_id);

                if ($stmt->execute()) {
                    // Log the movement
                    $logQuery = "INSERT INTO inventory_movements 
                                 (product_id, to_warehouse_id, to_bin, quantity, movement_type, status, created_by)
                                 VALUES (?, ?, ?, 1, 'adjustment', 'completed', ?)";
                    $logStmt = $db->prepare($logQuery);
                    $user_id = getCurrentUserId();
                    $logStmt->bindParam(1, $data->product_id);
                    $logStmt->bindParam(2, $warehouse_id);
                    $logStmt->bindParam(3, $data->bin_number);
                    $logStmt->bindParam(4, $user_id);
                    $logStmt->execute();

                    http_response_code(200);
                    echo json_encode(array(
                        "message" => "Product assigned to bin successfully.",
                        "product_id" => $data->product_id,
                        "bin_number" => $data->bin_number
                    ));
                } else {
                    http_response_code(500);
                    echo json_encode(array("message" => "Unable to assign bin."));
                }
                break;

            default:
                // Create general movement record
                if (empty($data->product_id) || empty($data->movement_type)) {
                    http_response_code(400);
                    echo json_encode(array("message" => "Product ID and movement type are required."));
                    exit;
                }

                $query = "INSERT INTO inventory_movements 
                          (product_id, from_warehouse_id, to_warehouse_id, from_bin, to_bin, 
                           quantity, movement_type, status, notes, created_by)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $db->prepare($query);

                $user_id = getCurrentUserId();
                $quantity = $data->quantity ?? 1;
                $status = $data->status ?? 'pending';

                $stmt->bindParam(1, $data->product_id);
                $stmt->bindParam(2, $data->from_warehouse_id);
                $stmt->bindParam(3, $data->to_warehouse_id);
                $stmt->bindParam(4, $data->from_bin);
                $stmt->bindParam(5, $data->to_bin);
                $stmt->bindParam(6, $quantity);
                $stmt->bindParam(7, $data->movement_type);
                $stmt->bindParam(8, $status);
                $stmt->bindParam(9, $data->notes);
                $stmt->bindParam(10, $user_id);

                if ($stmt->execute()) {
                    http_response_code(201);
                    echo json_encode(array(
                        "message" => "Movement created successfully.",
                        "id" => $db->lastInsertId()
                    ));
                } else {
                    http_response_code(500);
                    echo json_encode(array("message" => "Unable to create movement."));
                }
                break;
        }
        break;

    case 'PUT':
        // Update movement status
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->id) || empty($data->status)) {
            http_response_code(400);
            echo json_encode(array("message" => "Movement ID and status are required."));
            exit;
        }

        $valid_statuses = ['pending', 'in_transit', 'completed', 'cancelled'];
        if (!in_array($data->status, $valid_statuses)) {
            http_response_code(400);
            echo json_encode(array("message" => "Invalid status. Valid: " . implode(', ', $valid_statuses)));
            exit;
        }

        $query = "UPDATE inventory_movements SET status = ?, notes = ? WHERE id = ?";
        $stmt = $db->prepare($query);
        $notes = $data->notes ?? null;
        $stmt->bindParam(1, $data->status);
        $stmt->bindParam(2, $notes);
        $stmt->bindParam(3, $data->id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "Movement updated successfully."));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Unable to update movement."));
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(array("message" => "Method not allowed."));
        break;
}

// Helper function to get current user ID from JWT
function getCurrentUserId()
{
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = $matches[1];
        try {
            // Simple JWT decode (payload is base64)
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                $payload = json_decode(base64_decode($parts[1]), true);
                return $payload['id'] ?? $payload['user_id'] ?? null;
            }
        } catch (Exception $e) {
            return null;
        }
    }
    return null;
}
?>