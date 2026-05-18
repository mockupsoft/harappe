<?php
declare(strict_types=1);
require __DIR__ . '/../api/_lib/db.php';
echo harappe_pdo()->query('SELECT 1')->fetchColumn() === 1 ? 'ok' : 'fail';
