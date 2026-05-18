/**
 * Docker MySQL + şema doğrulaması (CI / yerel).
 * @license Apache-2.0
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePhpBinary } from './resolve-php.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const dc = spawnSync('docker', ['inspect', '--format={{.State.Running}}', 'harappe-mysql'], {
  encoding: 'utf8',
});
if (dc.status !== 0 || String(dc.stdout).trim() !== 'true') {
  fail('harappe-mysql konteyneri çalışmıyor. Önce: npm run db:docker:up');
}

const sql = spawnSync(
  'docker',
  ['exec', 'harappe-mysql', 'mysql', '-uharappe', '-pharappe_local_secret', 'harappe', '-e', 'SHOW TABLES;'],
  { encoding: 'utf8' }
);
if (sql.status !== 0) {
  fail('mysql SHOW TABLES başarısız: ' + (sql.stderr || sql.stdout));
}
const need = ['menu_items', 'orders', 'local_accounts', 'cafe_tables', 'user_profiles', 'price_logs'];
for (const t of need) {
  if (!sql.stdout.includes(t)) fail('Eksik tablo: ' + t + '\n' + sql.stdout);
}
console.log('Docker MySQL tabloları:', need.join(', '));

const env = {
  ...process.env,
  HARAPPE_DB_HOST: '127.0.0.1',
  HARAPPE_DB_PORT: '3307',
  HARAPPE_DB_DATABASE: 'harappe',
  HARAPPE_DB_USERNAME: 'harappe',
  HARAPPE_DB_PASSWORD: 'harappe_local_secret',
  HARAPPE_DB_SSL: '0',
};
const php = resolvePhpBinary();
const probe = join(root, 'scripts', 'probe-pdo.php');
if (!existsSync(probe)) fail('Eksik: scripts/probe-pdo.php');
const p = spawnSync(php, [probe], { cwd: root, env, encoding: 'utf8' });
if (p.status !== 0) {
  fail('PDO testi başarısız: ' + (p.stderr || p.stdout));
}
console.log('PDO:', p.stdout.trim());

console.log('verify:docker tamam.');
