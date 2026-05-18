<?php
declare(strict_types=1);

require __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = harappe_pdo();

try {
    if ($method === 'GET') {
        $uid = $_GET['uid'] ?? '';
        if ($uid === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'uid gerekli']);
            exit;
        }
        $stmt = $pdo->prepare('SELECT data FROM user_profiles WHERE uid = ?');
        $stmt->execute([$uid]);
        $row = $stmt->fetch();
        if (!$row) {
            echo json_encode(null);
            exit;
        }
        $data = json_decode($row['data'], true);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'PUT') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body) || empty($body['uid'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Geçersiz profil']);
            exit;
        }
        $uid = (string)$body['uid'];
        $stmt = $pdo->prepare(
            'INSERT INTO user_profiles (uid, data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data)'
        );
        $stmt->execute([$uid, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)]);
        echo json_encode(['ok' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
}
