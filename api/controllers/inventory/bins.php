<?php
// Bin Management API
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
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

// Route based on method
switch ($method) {
    case 'GET':
        // Get bins (optionally filtered by warehouse)
        $warehouse_id = $_GET['warehouse_id'] ?? null;
        $id = $_GET['id'] ?? null;

        if ($id) {
            // Get single bin with product count
            $query = "SELECT b.*, w.name as warehouse_name,
                             COUNT(p.id) as product_count
                      FROM bins b
                      LEFT JOIN warehouses w ON b.warehouse_id = w.id
                      LEFT JOIN products p ON b.warehouse_id = p.warehouse_id AND b.bin_number = p.bin_number
                      WHERE b.id = ?
                      GROUP BY b.id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $id);
            $stmt->execute();

            $bin = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($bin) {
                http_response_code(200);
                echo json_encode($bin);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Bin not found."));
            }
        } else {
            // Get all bins or by warehouse
            $query = "SELECT b.*, w.name as warehouse_name,
                             COUNT(p.id) as product_count
                      FROM bins b
                      LEFT JOIN warehouses w ON b.warehouse_id = w.id
                      LEFT JOIN products p ON b.warehouse_id = p.warehouse_id AND b.bin_number = p.bin_number";

            if ($warehouse_id) {
                $query .= " WHERE b.warehouse_id = ?";
            }

            $query .= " GROUP BY b.id ORDER BY b.bin_number";

            $stmt = $db->prepare($query);

            if ($warehouse_id) {
                $stmt->bindParam(1, $warehouse_id);
            }

            $stmt->execute();
            $bins = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode(array("bins" => $bins));
        }
        break;

    case 'POST':
        // Create new bin
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->warehouse_id) || empty($data->bin_number)) {
            http_response_code(400);
            echo json_encode(array("message" => "Warehouse ID and bin number are required."));
            exit;
        }

        // Check if bin already exists in this warehouse
        $check = $db->prepare("SELECT id FROM bins WHERE warehouse_id = ? AND bin_number = ?");
        $check->bindParam(1, $data->warehouse_id);
        $check->bindParam(2, $data->bin_number);
        $check->execute();

        if ($check->fetch()) {
            http_response_code(400);
            echo json_encode(array("message" => "Bin number already exists in this warehouse."));
            exit;
        }

        $query = "INSERT INTO bins (warehouse_id, bin_number, description, capacity, is_active) VALUES (?, ?, ?, ?, ?)";
        $stmt = $db->prepare($query);

        $warehouse_id = $data->warehouse_id;
        $bin_number = $data->bin_number;
        $description = $data->description ?? null;
        $capacity = $data->capacity ?? 100;
        $is_active = $data->is_active ?? true;

        $stmt->bindParam(1, $warehouse_id);
        $stmt->bindParam(2, $bin_number);
        $stmt->bindParam(3, $description);
        $stmt->bindParam(4, $capacity);
        $stmt->bindParam(5, $is_active, PDO::PARAM_BOOL);

        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            http_response_code(201);
            echo json_encode(array(
                "message" => "Bin created successfully.",
                "id" => $new_id
            ));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Unable to create bin."));
        }
        break;

    case 'PUT':
        // Update bin
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->id)) {
            http_response_code(400);
            echo json_encode(array("message" => "Bin ID is required."));
            exit;
        }

        $query = "UPDATE bins SET bin_number = ?, description = ?, capacity = ?, is_active = ? WHERE id = ?";
        $stmt = $db->prepare($query);

        $stmt->bindParam(1, $data->bin_number);
        $stmt->bindParam(2, $data->description);
        $stmt->bindParam(3, $data->capacity);
        $stmt->bindParam(4, $data->is_active, PDO::PARAM_BOOL);
        $stmt->bindParam(5, $data->id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "Bin updated successfully."));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Unable to update bin."));
        }
        break;

    case 'DELETE':
        // Delete bin
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $id = $_GET['id'] ?? null;

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(array("message" => "Bin ID is required."));
            exit;
        }

        // Get bin info first
        $getBin = $db->prepare("SELECT warehouse_id, bin_number FROM bins WHERE id = ?");
        $getBin->bindParam(1, $id);
        $getBin->execute();
        $bin = $getBin->fetch(PDO::FETCH_ASSOC);

        if ($bin) {
            // Check if bin has products
            $check = $db->prepare("SELECT COUNT(*) FROM products WHERE warehouse_id = ? AND bin_number = ?");
            $check->bindParam(1, $bin['warehouse_id']);
            $check->bindParam(2, $bin['bin_number']);
            $check->execute();

            if ($check->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(array("message" => "Cannot delete bin with products. Move products first."));
                exit;
            }
        }

        $query = "DELETE FROM bins WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "Bin deleted successfully."));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Unable to delete bin."));
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(array("message" => "Method not allowed."));
        break;
}
?>