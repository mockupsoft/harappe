<?php
declare(strict_types=1);

/**
 * Menü yenilemesi sonrası: tüm siparişleri ve kullanıcı favorilerini sıfırlar.
 * Fiyat geçmişi (price_logs) eski ürün id'leriyle uyumsuz kalmasın diye temizlenir.
 *
 * Laragon: php scripts/reset-legacy-data.php
 *
 * @license Apache-2.0
 */

require_once dirname(__DIR__) . '/api/_lib/db.php';

$pdo = harappe_pdo();

$pdo->beginTransaction();
try {
    $pdo->exec('DELETE FROM orders');

    try {
        $pdo->exec('DELETE FROM price_logs');
    } catch (Throwable $e) {
        // Tablo yoksa veya farklı ortam
    }

    $sel = $pdo->query('SELECT uid, data FROM user_profiles');
    $rows = $sel ? $sel->fetchAll(PDO::FETCH_ASSOC) : [];
    $upd = $pdo->prepare('UPDATE user_profiles SET data = ? WHERE uid = ?');

    foreach ($rows as $row) {
        $uid = (string)($row['uid'] ?? '');
        if ($uid === '') {
            continue;
        }
        $data = json_decode((string)($row['data'] ?? '{}'), true);
        if (!is_array($data)) {
            $data = ['uid' => $uid];
        }
        $data['favorites'] = [];
        $upd->execute([
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            $uid,
        ]);
    }

    $pdo->commit();
    fwrite(STDOUT, "Siparişler silindi, favoriler sıfırlandı, price_logs temizlendi.\n");
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, 'Hata: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
