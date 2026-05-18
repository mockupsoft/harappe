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
    return new PDO($dsn, $c['username'], $c['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}
