<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allow = false;
if ($origin !== '') {
    $extra = getenv('HARAPPE_ALLOWED_ORIGINS');
    if (is_string($extra) && $extra !== '') {
        foreach (array_map('trim', explode(',', $extra)) as $o) {
            if ($o !== '' && strcasecmp($o, $origin) === 0) {
                $allow = true;
                break;
            }
        }
    }
    if (!$allow) {
        $allow =
            preg_match('#^https?://localhost(:\d+)?$#', $origin)
            || preg_match('#^https?://127\.0\.0\.1(:\d+)?$#', $origin)
            || preg_match('#^https?://.*\.test(:\d+)?$#i', $origin)
            || preg_match('#^https://[^/]+\.vercel\.app$#i', $origin);
    }
}

if ($allow && $origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
