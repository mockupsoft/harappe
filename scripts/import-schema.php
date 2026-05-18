<?php
declare(strict_types=1);

/**
 * Veritabanı yoksa veya tablolar eksikse schema.sql dosyasını uygular.
 * Laragon: php scripts/import-schema.php
 *
 * @license Apache-2.0
 */

require_once dirname(__DIR__) . '/api/_lib/db.php';

$c = harappe_db_config();

$mysqli = @new mysqli($c['host'], $c['username'], $c['password'], '', $c['port']);
if ($mysqli->connect_errno) {
    fwrite(STDERR, 'MySQL bağlantı hatası: ' . $mysqli->connect_error . PHP_EOL);
    exit(1);
}

$mysqli->set_charset($c['charset']);

$sqlPath = dirname(__DIR__) . '/database/schema.sql';
if (!is_readable($sqlPath)) {
    fwrite(STDERR, 'Dosya bulunamadı: ' . $sqlPath . PHP_EOL);
    exit(1);
}

$sql = file_get_contents($sqlPath);
if ($sql === false || $sql === '') {
    fwrite(STDERR, 'schema.sql okunamadı.' . PHP_EOL);
    exit(1);
}

if (!$mysqli->multi_query($sql)) {
    fwrite(STDERR, 'multi_query: ' . $mysqli->error . PHP_EOL);
    exit(1);
}

do {
    if ($result = $mysqli->store_result()) {
        $result->free();
    }
    if ($mysqli->errno) {
        fwrite(STDERR, 'SQL hatası: ' . $mysqli->error . PHP_EOL);
        exit(1);
    }
} while ($mysqli->more_results() && $mysqli->next_result());

echo 'schema.sql başarıyla uygulandı (harappe).' . PHP_EOL;
