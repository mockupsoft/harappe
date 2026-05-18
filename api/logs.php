<?php
declare(strict_types=1);

require __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = harappe_pdo();

try {
    if ($method === 'GET') {
        $stmt = $pdo->query(
            'SELECT data FROM price_logs ORDER BY created_at DESC LIMIT 100'
        );
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            $decoded = json_decode($row['data'], true);
            if (is_array($decoded)) {
                $out[] = $decoded;
            }
        }
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Geçersiz JSON']);
            exit;
        }
        $id = $body['id'] ?? ('log_' . bin2hex(random_bytes(5)));
        $body['id'] = $id;
        if (!isset($body['timestamp'])) {
            $body['timestamp'] = ['seconds' => time()];
        }

        $ins = $pdo->prepare('INSERT INTO price_logs (id, data) VALUES (?, ?)');
        $ins->execute([$id, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)]);

        echo json_encode($body, JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
}
