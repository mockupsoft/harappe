<?php
declare(strict_types=1);

/**
 * Müşteri kayıt / giriş: şifre password_hash (bcrypt) ile local_accounts tablosunda.
 *
 * @license Apache-2.0
 */

require __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'code' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw !== false ? $raw : '', true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'code' => 'invalid_body'], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = (string)($body['action'] ?? '');

/**
 * @return string normalized email
 */
function harappe_norm_email(string $e): string
{
    return strtolower(trim($e));
}

/**
 * src/lib/adminPolicy.ts içindeki OWNER_ADMIN_EMAILS ile aynı tutulmalı.
 */
function harappe_email_grants_admin(string $email): bool
{
    $owners = ['keremarcaa@gmail.com', 'admin@harappe.com'];
    return in_array(harappe_norm_email($email), $owners, true);
}

/**
 * Eksik migration sonrası ilk istekte tabloyu oluşturur (şema database/schema.sql ile aynı).
 */
function harappe_ensure_local_accounts(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `local_accounts` (
            `uid` VARCHAR(64) NOT NULL,
            `email` VARCHAR(255) NOT NULL,
            `password_hash` VARCHAR(255) NOT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`uid`),
            UNIQUE KEY `uq_local_accounts_email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function harappe_ensure_user_profiles(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS `user_profiles` (
            `uid` VARCHAR(128) NOT NULL,
            `data` JSON NOT NULL,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`uid`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

try {
    $pdo = harappe_pdo();
    harappe_ensure_user_profiles($pdo);
    harappe_ensure_local_accounts($pdo);
    if ($action === 'register') {
        $email = harappe_norm_email((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'code' => 'invalid_email'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'code' => 'weak_password'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $check = $pdo->prepare('SELECT uid FROM local_accounts WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['ok' => false, 'code' => 'email_in_use'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $uid = 'local_' . bin2hex(random_bytes(16));
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $localPart = explode('@', $email, 2)[0];
        $name = str_replace(['.', '_'], ' ', $localPart);
        if ($name === '') {
            $name = 'Misafir';
        }

        $profile = [
            'uid' => $uid,
            'name' => $name,
            'email' => $email,
            'rewardPoints' => 0,
            'isAdmin' => harappe_email_grants_admin($email),
            'createdAt' => gmdate('c'),
        ];

        $pdo->beginTransaction();
        try {
            $insAcc = $pdo->prepare(
                'INSERT INTO local_accounts (uid, email, password_hash) VALUES (?, ?, ?)'
            );
            $insAcc->execute([$uid, $email, $hash]);

            $insProf = $pdo->prepare(
                'INSERT INTO user_profiles (uid, data) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE data = VALUES(data)'
            );
            $flags = JSON_UNESCAPED_UNICODE;
            if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
                $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
            }
            $insProf->execute([
                $uid,
                json_encode($profile, $flags),
            ]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        echo json_encode(
            [
                'ok' => true,
                'uid' => $uid,
                'email' => $email,
                'displayName' => $name,
            ],
            JSON_UNESCAPED_UNICODE
        );
        exit;
    }

    if ($action === 'login') {
        $email = harappe_norm_email((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($email === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'code' => 'invalid_email'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $pdo->prepare('SELECT uid, email, password_hash FROM local_accounts WHERE email = ?');
        $stmt->execute([$email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            echo json_encode(['ok' => false, 'code' => 'local_user_not_found'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (!password_verify($password, $row['password_hash'])) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'code' => 'invalid_credentials'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $displayName = explode('@', (string)$row['email'], 2)[0];
        $stmt2 = $pdo->prepare('SELECT data FROM user_profiles WHERE uid = ?');
        $stmt2->execute([$row['uid']]);
        $prow = $stmt2->fetch(PDO::FETCH_ASSOC);
        if ($prow) {
            $data = json_decode($prow['data'], true);
            if (is_array($data) && isset($data['name']) && is_string($data['name']) && $data['name'] !== '') {
                $displayName = $data['name'];
            }
        }

        echo json_encode(
            [
                'ok' => true,
                'uid' => $row['uid'],
                'email' => $row['email'],
                'displayName' => $displayName,
            ],
            JSON_UNESCAPED_UNICODE
        );
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'code' => 'unknown_action'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(
        ['ok' => false, 'code' => 'server_error', 'message' => $e->getMessage()],
        JSON_UNESCAPED_UNICODE
    );
}
