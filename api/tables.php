<?php
declare(strict_types=1);

require __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = harappe_pdo();

try {
    if ($method === 'GET') {
        $stmt = $pdo->query('SELECT data FROM cafe_tables ORDER BY sort_order ASC, id ASC');
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

    if ($method === 'PUT') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Geçersiz JSON']);
            exit;
        }

        $pdo->beginTransaction();
        $pdo->exec('DELETE FROM cafe_tables');
        $ins = $pdo->prepare('INSERT INTO cafe_tables (id, data, sort_order) VALUES (?, ?, ?)');
        $sort = 0;
        foreach ($body as $t) {
            if (!is_array($t)) {
                continue;
            }
            $id = $t['id'] ?? '';
            if ($id === '') {
                continue;
            }
            $ins->execute([$id, json_encode($t, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), $sort]);
            $sort++;
        }
        $pdo->commit();
        echo json_encode(['ok' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
}
