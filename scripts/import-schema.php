<?php
declare(strict_types=1);

/**
 * Veritabanı yoksa veya tablolar eksikse şema dosyasını uygular.
 *
 * - Laragon (config.local): database/schema.sql (CREATE DATABASE + USE + tablolar)
 * - Uzak / Vercel (HARAPPE_DB_HOST): database/schema-tables.sql (yalnızca tablolar; DB panelden oluşturulmuş olmalı)
 *
 * Laragon: php scripts/import-schema.php
 * Uzak: aynı komut; önce .env veya ortamda HARAPPE_DB_* tanımlı olsun. SSL: HARAPPE_DB_SSL=1
 *
 * @license Apache-2.0
 */

require_once dirname(__DIR__) . '/api/_lib/db.php';

$c = harappe_db_config();
$useHosted = is_string(getenv('HARAPPE_DB_HOST')) && trim((string)getenv('HARAPPE_DB_HOST')) !== '';

$sqlPath = $useHosted
    ? dirname(__DIR__) . '/database/schema-tables.sql'
    : dirname(__DIR__) . '/database/schema.sql';

if (!is_readable($sqlPath)) {
    fwrite(STDERR, 'Dosya bulunamadı: ' . $sqlPath . PHP_EOL);
    exit(1);
}

$sql = file_get_contents($sqlPath);
if ($sql === false || $sql === '') {
    fwrite(STDERR, 'Şema dosyası okunamadı.' . PHP_EOL);
    exit(1);
}

$dbForConn = $useHosted ? $c['database'] : '';

$mysqli = mysqli_init();
if ($mysqli === false) {
    fwrite(STDERR, 'mysqli_init başarısız.' . PHP_EOL);
    exit(1);
}

$flags = 0;
if ($useHosted && harappe_db_env_ssl_enabled()) {
    $cap = harappe_resolve_ssl_ca();
    if ($cap !== null) {
        $mysqli->ssl_set(null, null, $cap, null, null);
    }
    if (defined('MYSQLI_CLIENT_SSL')) {
        $flags |= (int)constant('MYSQLI_CLIENT_SSL');
    }
    if (defined('MYSQLI_OPT_SSL_VERIFY_SERVER_CERT')) {
        mysqli_options($mysqli, MYSQLI_OPT_SSL_VERIFY_SERVER_CERT, $cap !== null);
    }
}

if (!mysqli_real_connect($mysqli, $c['host'], $c['username'], $c['password'], $dbForConn, $c['port'], null, $flags)) {
    fwrite(STDERR, 'MySQL bağlantı hatası: ' . mysqli_connect_error() . PHP_EOL);
    exit(1);
}

$mysqli->set_charset($c['charset']);

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

$mysqli->close();

echo $useHosted
    ? 'schema-tables.sql uygulandı (uzak DB: ' . $c['database'] . ').' . PHP_EOL
    : 'schema.sql uygulandı (Laragon / tam şema).' . PHP_EOL;
