<?php
declare(strict_types=1);

/**
 * @return array{host:string,port:int,database:string,username:string,password:string,charset:string}
 */
function harappe_db_config(): array
{
    $host = getenv('HARAPPE_DB_HOST');
    if (is_string($host) && $host !== '') {
        $port = getenv('HARAPPE_DB_PORT');
        $db = getenv('HARAPPE_DB_DATABASE');
        $user = getenv('HARAPPE_DB_USERNAME');
        $pass = getenv('HARAPPE_DB_PASSWORD');
        $charset = getenv('HARAPPE_DB_CHARSET');

        return [
            'host' => $host,
            'port' => $port !== false && $port !== '' ? (int)$port : 3306,
            'database' => is_string($db) && $db !== '' ? $db : 'harappe',
            'username' => is_string($user) && $user !== '' ? $user : 'root',
            'password' => is_string($pass) ? $pass : '',
            'charset' => is_string($charset) && $charset !== '' ? $charset : 'utf8mb4',
        ];
    }

    $root = dirname(__DIR__);
    $local = $root . '/config.local.php';
    $cfg = file_exists($local)
        ? require $local
        : require $root . '/config.example.php';

    return [
        'host' => (string)($cfg['host'] ?? '127.0.0.1'),
        'port' => (int)($cfg['port'] ?? 3306),
        'database' => (string)($cfg['database'] ?? 'harappe'),
        'username' => (string)($cfg['username'] ?? 'root'),
        'password' => (string)($cfg['password'] ?? ''),
        'charset' => (string)($cfg['charset'] ?? 'utf8mb4'),
    ];
}

/**
 * HARAPPE_DB_SSL=1 ve CA yoksa doğrulama kapatılır (Railway vb. uyumu); üretimde CA kullanmayı tercih edin.
 */
function harappe_db_env_ssl_enabled(): bool
{
    $v = getenv('HARAPPE_DB_SSL');
    if ($v === false || $v === '') {
        return false;
    }
    $lower = strtolower(trim((string)$v));
    return !in_array($lower, ['0', 'false', 'off', 'no'], true);
}

/**
 * HARAPPE_DB_SSL_CA: dosya yolu veya PEM metni (Vercel’de dosya yolu yoksa PEM kullanılabilir).
 *
 * @return non-empty-string|null
 */
function harappe_resolve_ssl_ca(): ?string
{
    if (!harappe_db_env_ssl_enabled()) {
        return null;
    }
    $ca = getenv('HARAPPE_DB_SSL_CA');
    if (!is_string($ca) || trim($ca) === '') {
        return null;
    }
    $ca = trim($ca);
    if (str_starts_with($ca, '-----BEGIN')) {
        static $pemTmp = null;
        if ($pemTmp !== null) {
            return $pemTmp;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'hrca');
        if ($tmp === false) {
            return null;
        }
        file_put_contents($tmp, $ca);
        register_shutdown_function(static function () use ($tmp): void {
            if (is_file($tmp)) {
                @unlink($tmp);
            }
        });
        return $pemTmp = $tmp;
    }
    return is_readable($ca) ? $ca : null;
}

function harappe_pdo(): PDO
{
    $c = harappe_db_config();
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $c['host'],
        $c['port'],
        $c['database'],
        $c['charset']
    );
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 12,
    ];
    if (harappe_db_env_ssl_enabled()) {
        $cap = harappe_resolve_ssl_ca();
        if ($cap !== null) {
            $opts[PDO::MYSQL_ATTR_SSL_CA] = $cap;
        } else {
            $opts[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }
    }
    return new PDO($dsn, $c['username'], $c['password'], $opts);
}
