<?php
/**
 * Docker MySQL (docker-compose.yml, port 3307) için örnek.
 * Kullanım: bu dosyayı kopyalayıp api/config.local.php yapın
 * veya içeriği mevcut config.local.php ile birleştirin.
 */
return [
    'host' => '127.0.0.1',
    'port' => 3307,
    'database' => 'harappe',
    'username' => 'harappe',
    'password' => 'harappe_local_secret',
    'charset' => 'utf8mb4',
];
