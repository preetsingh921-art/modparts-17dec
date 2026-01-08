<?php
// Warehouse Management API
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
        // Get all warehouses or single warehouse
        $id = $_GET['id'] ?? null;

        if ($id) {
            // Get single warehouse with bin count
            $query = "SELECT w.*, 
                             COUNT(DISTINCT b.id) as bin_count,
                             COUNT(DISTINCT p.id) as product_count
                      FROM warehouses w
                      LEFT JOIN bins b ON w.id = b.warehouse_id
                      LEFT JOIN products p ON w.id = p.warehouse_id
                      WHERE w.id = ?
                      GROUP BY w.id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(1, $id);
            $stmt->execute();

            $warehouse = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($warehouse) {
                http_response_code(200);
                echo json_encode($warehouse);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "Warehouse not found."));
            }
        } else {
            // Get all warehouses
            $query = "SELECT w.*, 
                             COUNT(DISTINCT b.id) as bin_count,
                             COUNT(DISTINCT p.id) as product_count
                      FROM warehouses w
                      LEFT JOIN bins b ON w.id = b.warehouse_id
                      LEFT JOIN products p ON w.id = p.warehouse_id
                      GROUP BY w.id
                      ORDER BY w.name";
            $stmt = $db->prepare($query);
            $stmt->execute();

            $warehouses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode(array("warehouses" => $warehouses));
        }
        break;

    case 'POST':
        // Create new warehouse
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->name)) {
            http_response_code(400);
            echo json_encode(array("message" => "Warehouse name is required."));
            exit;
        }

        $query = "INSERT INTO warehouses (name, location, country, is_active) VALUES (?, ?, ?, ?)";
        $stmt = $db->prepare($query);

        $name = $data->name;
        $location = $data->location ?? null;
        $country = $data->country ?? null;
        $is_active = $data->is_active ?? true;

        $stmt->bindParam(1, $name);
        $stmt->bindParam(2, $location);
        $stmt->bindParam(3, $country);
        $stmt->bindParam(4, $is_active, PDO::PARAM_BOOL);

        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            http_response_code(201);
            echo json_encode(array(
                "message" => "Warehouse created successfully.",
                "id" => $new_id
            ));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Unable to create warehouse."));
        }
        break;

    case 'PUT':
        // Update warehouse
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->id)) {
            http_response_code(400);
            echo json_encode(array("message" => "Warehouse ID is required."));
            exit;
        }

        $query = "UPDATE warehouses SET name = ?, location = ?, country = ?, is_active = ? WHERE id = ?";
        $stmt = $db->prepare($query);

        $stmt->bindParam(1, $data->name);
        $stmt->bindParam(2, $data->location);
        $stmt->bindParam(3, $data->country);
        $stmt->bindParam(4, $data->is_active, PDO::PARAM_BOOL);
        $stmt->bindParam(5, $data->id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "Warehouse updated successfully."));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Unable to update warehouse."));
        }
        break;

    case 'DELETE':
        // Delete warehouse
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $id = $_GET['id'] ?? null;

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(array("message" => "Warehouse ID is required."));
            exit;
        }

        // Check if warehouse has products
        $check = $db->prepare("SELECT COUNT(*) FROM products WHERE warehouse_id = ?");
        $check->bindParam(1, $id);
        $check->execute();

        if ($check->fetchColumn() > 0) {
            http_response_code(400);
            echo json_encode(array("message" => "Cannot delete warehouse with products. Move products first."));
            exit;
        }

        $query = "DELETE FROM warehouses WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "Warehouse deleted successfully."));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "Unable to delete warehouse."));
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(array("message" => "Method not allowed."));
        break;
}
?>