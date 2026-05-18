<?php
declare(strict_types=1);

require __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/db.php';

try {
    $pdo = harappe_pdo();
    $pdo->query('SELECT 1');
    echo json_encode([
        'ok' => true,
        'db' => true,
        'message' => 'MySQL bağlantısı başarılı',
        'database' => harappe_db_config()['database'],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'db' => false,
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
