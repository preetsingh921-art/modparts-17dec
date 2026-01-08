<?php
// Barcode Generation and Management API
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
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

// Instantiate product object
$product = new Product($db);

// Route based on action parameter
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'generate':
        // Generate barcode for a product
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->product_id)) {
            http_response_code(400);
            echo json_encode(array("message" => "Product ID is required."));
            exit;
        }

        $product->id = $data->product_id;

        if ($product->readOne()) {
            // Generate barcode
            $barcode = $product->generateBarcode();

            // Save the barcode
            if ($product->updateBarcode()) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "Barcode generated successfully.",
                    "barcode" => $barcode,
                    "product_id" => $product->id,
                    "product_name" => $product->name,
                    "part_number" => $product->part_number
                ));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "Unable to save barcode."));
            }
        } else {
            http_response_code(404);
            echo json_encode(array("message" => "Product not found."));
        }
        break;

    case 'bulk-generate':
        // Generate barcodes for multiple products
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->product_ids) || !is_array($data->product_ids)) {
            http_response_code(400);
            echo json_encode(array("message" => "Product IDs array is required."));
            exit;
        }

        $results = array();
        $success_count = 0;
        $error_count = 0;

        foreach ($data->product_ids as $product_id) {
            $product->id = $product_id;

            if ($product->readOne()) {
                $barcode = $product->generateBarcode();

                if ($product->updateBarcode()) {
                    $results[] = array(
                        "product_id" => $product_id,
                        "barcode" => $barcode,
                        "product_name" => $product->name,
                        "success" => true
                    );
                    $success_count++;
                } else {
                    $results[] = array(
                        "product_id" => $product_id,
                        "success" => false,
                        "error" => "Failed to save barcode"
                    );
                    $error_count++;
                }
            } else {
                $results[] = array(
                    "product_id" => $product_id,
                    "success" => false,
                    "error" => "Product not found"
                );
                $error_count++;
            }
        }

        http_response_code(200);
        echo json_encode(array(
            "message" => "Bulk barcode generation completed.",
            "success_count" => $success_count,
            "error_count" => $error_count,
            "results" => $results
        ));
        break;

    case 'scan':
    case 'lookup':
        // Lookup product by barcode (used when scanning)
        $barcode = $_GET['barcode'] ?? '';

        if (empty($barcode)) {
            $data = json_decode(file_get_contents("php://input"));
            $barcode = $data->barcode ?? '';
        }

        if (empty($barcode)) {
            http_response_code(400);
            echo json_encode(array("message" => "Barcode is required."));
            exit;
        }

        $result = $product->readByBarcode($barcode);

        if ($result) {
            http_response_code(200);
            echo json_encode(array(
                "message" => "Product found.",
                "product" => $result
            ));
        } else {
            http_response_code(404);
            echo json_encode(array("message" => "Product not found with barcode: " . $barcode));
        }
        break;

    case 'print-data':
        // Get product data formatted for label printing
        if (!validateAdmin()) {
            http_response_code(403);
            echo json_encode(array("message" => "Access denied."));
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->product_ids) || !is_array($data->product_ids)) {
            http_response_code(400);
            echo json_encode(array("message" => "Product IDs array is required."));
            exit;
        }

        $labels = array();

        foreach ($data->product_ids as $product_id) {
            $product->id = $product_id;

            if ($product->readOne()) {
                // Generate barcode if not exists
                if (empty($product->barcode)) {
                    $product->generateBarcode();
                    $product->updateBarcode();
                }

                $labels[] = array(
                    "product_id" => $product->id,
                    "name" => $product->name,
                    "part_number" => $product->part_number,
                    "barcode" => $product->barcode,
                    "price" => $product->price,
                    "condition" => $product->condition_status,
                    "warehouse" => $product->warehouse_name,
                    "bin" => $product->bin_number
                );
            }
        }

        http_response_code(200);
        echo json_encode(array(
            "message" => "Print data retrieved.",
            "labels" => $labels
        ));
        break;

    default:
        http_response_code(400);
        echo json_encode(array("message" => "Invalid action. Use: generate, bulk-generate, scan, lookup, print-data"));
        break;
}
?>