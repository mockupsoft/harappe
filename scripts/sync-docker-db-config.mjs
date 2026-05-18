/**
 * api/config.docker.example.php → api/config.local.php
 * Laragon PHP API'nin Docker MySQL (3307) ile çalışması için.
 *
 * @license Apache-2.0
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'api', 'config.docker.example.php');
const dest = join(root, 'api', 'config.local.php');

const force = process.argv.includes('--force');

if (!existsSync(src)) {
  console.error('Bulunamadı:', src);
  process.exit(1);
}

if (existsSync(dest) && !force) {
  console.log('Atlandı (zaten var):', dest);
  console.log('Üzerine yazmak için: node scripts/sync-docker-db-config.mjs --force');
  process.exit(0);
}

copyFileSync(src, dest);
console.log('Yazıldı:', dest, '←', 'api/config.docker.example.php');
