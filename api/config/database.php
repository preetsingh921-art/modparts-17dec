<?php
class Database {
    private $conn;
    
    public function getConnection() {
        $this->conn = null;
        
        // Get DATABASE_URL from environment (Neon DB)
        $database_url = getenv('DATABASE_URL');
        
        // Fallback to .env.local file if environment variable not set
        if (!$database_url) {
            $env_file = __DIR__ . '/../../.env.local';
            if (file_exists($env_file)) {
                $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (strpos(trim($line), '#') === 0) continue;
                    if (strpos($line, 'DATABASE_URL=') === 0) {
                        $database_url = substr($line, strlen('DATABASE_URL='));
                        break;
                    }
                }
            }
        }
        
        if (!$database_url) {
            header("Content-Type: application/json; charset=UTF-8");
            http_response_code(500);
            echo json_encode(array("message" => "Database URL not configured"));
            exit;
        }
        
        try {
            // Parse the PostgreSQL connection URL
            $parsed = parse_url($database_url);
            
            $host = $parsed['host'] ?? '';
            $port = $parsed['port'] ?? 5432;
            $dbname = ltrim($parsed['path'] ?? '', '/');
            $user = $parsed['user'] ?? '';
            $password = $parsed['pass'] ?? '';
            
            // Parse query parameters for sslmode
            $query = [];
            if (isset($parsed['query'])) {
                parse_str($parsed['query'], $query);
            }
            $sslmode = $query['sslmode'] ?? 'require';
            
            // Build PDO DSN for PostgreSQL
            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode={$sslmode}";
            
            $this->conn = new PDO(
                $dsn,
                $user,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
            
            error_log("Database: Connected to Neon PostgreSQL successfully");
            
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            header("Content-Type: application/json; charset=UTF-8");
            http_response_code(500);
            echo json_encode(array("message" => "Database connection error: " . $exception->getMessage()));
            exit;
        }
        
        return $this->conn;
    }
}
?>
