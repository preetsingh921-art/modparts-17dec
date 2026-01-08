<?php
// Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include database, product model, and auth middleware
include_once '../../config/database.php';
include_once '../../models/Product.php';
include_once '../../middleware/auth.php';

// Check if user is admin
if (!validateAdmin()) {
    // Set response code - 403 Forbidden
    http_response_code(403);

    // Tell the user access denied
    echo json_encode(array("message" => "Access denied."));
    exit;
}

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Instantiate product object
$product = new Product($db);

// Get posted data
$data = json_decode(file_get_contents("php://input"));

// Make sure id is not empty
if (!empty($data->id)) {
    // Set ID property of product to be updated
    $product->id = $data->id;

    // Set product property values
    $product->name = $data->name;
    $product->price = $data->price;
    $product->description = $data->description;
    $product->category_id = $data->category_id;
    $product->condition_status = $data->condition_status;
    $product->quantity = $data->quantity;
    $product->image_url = $data->image_url;
    $product->part_number = $data->part_number ?? null;
    $product->barcode = $data->barcode ?? null;

    // Log the update attempt
    error_log("[PRODUCT UPDATE] Attempting to update product ID: " . $product->id);
    error_log("[PRODUCT UPDATE] Data: " . json_encode([
        'name' => $product->name,
        'price' => $product->price,
        'category_id' => $product->category_id,
        'part_number' => $product->part_number,
        'barcode' => $product->barcode
    ]));

    // Update the product
    if ($product->update()) {
        // Set response code - 200 OK
        http_response_code(200);

        // Log success
        error_log("[PRODUCT UPDATE] SUCCESS - Product ID: " . $product->id);

        // Tell the user
        echo json_encode(array(
            "message" => "Product was updated.",
            "product_id" => $product->id
        ));
    } else {
        // Set response code - 503 Service Unavailable
        http_response_code(503);

        // Log failure
        error_log("[PRODUCT UPDATE] FAILED - Product ID: " . $product->id);

        // Tell the user
        echo json_encode(array("message" => "Unable to update product."));
    }
} else {
    // Set response code - 400 Bad Request
    http_response_code(400);

    // Log missing ID
    error_log("[PRODUCT UPDATE] ERROR - No product ID provided");

    // Tell the user
    echo json_encode(array("message" => "Unable to update product. No ID provided."));
}
?>