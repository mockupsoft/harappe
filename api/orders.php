<?php
declare(strict_types=1);

require __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = harappe_pdo();

try {
    if ($method === 'GET') {
        $stmt = $pdo->query('SELECT payload FROM orders ORDER BY created_at ASC');
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            $decoded = json_decode($row['payload'], true);
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
        $id = $body['id'] ?? ('order_' . bin2hex(random_bytes(6)));
        $body['id'] = $id;
        if (!isset($body['createdAt'])) {
            $body['createdAt'] = ['seconds' => time()];
        }
        $stmt = $pdo->prepare('INSERT INTO orders (id, payload) VALUES (?, ?)');
        $stmt->execute([$id, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)]);
        echo json_encode($body, JSON_UNESCAPED_UNICODE);
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
        $pdo->exec('DELETE FROM orders');
        $ins = $pdo->prepare('INSERT INTO orders (id, payload) VALUES (?, ?)');
        foreach ($body as $order) {
            if (!is_array($order) || empty($order['id'])) {
                continue;
            }
            $ins->execute([
                $order['id'],
                json_encode($order, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            ]);
        }
        $pdo->commit();
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($method === 'PATCH') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body) || empty($body['id']) || empty($body['status'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'id ve status gerekli']);
            exit;
        }
        $id = (string)$body['id'];
        $status = (string)$body['status'];

        $stmt = $pdo->prepare('SELECT payload FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'message' => 'Sipariş bulunamadı']);
            exit;
        }
        $data = json_decode($row['payload'], true);
        if (!is_array($data)) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Bozuk kayıt']);
            exit;
        }
        $data['status'] = $status;
        $upd = $pdo->prepare('UPDATE orders SET payload = ? WHERE id = ?');
        $upd->execute([json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), $id]);
        echo json_encode(['ok' => true, 'order' => $data]);
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
