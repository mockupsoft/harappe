/**
 * Docker MySQL ayağa kalkana kadar bekler, ardından schema-tables.sql uygular.
 * Ortam: .env.docker (varsa) + aşağıdaki varsayılanlar.
 *
 * @license Apache-2.0
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import { resolvePhpBinary } from './resolve-php.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** @returns {Record<string, string>} */
function loadEnvDocker() {
  const p = join(root, '.env.docker');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/** @param {string} host @param {string|number} port */
function waitPort(host, port, maxAttempts = 60) {
  const n = typeof port === 'string' ? parseInt(port, 10) : port;
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryOnce = () => {
      attempt += 1;
      const c = createConnection({ host, port: n }, () => {
        c.destroy();
        resolve(undefined);
      });
      c.on('error', () => {
        c.destroy();
        if (attempt >= maxAttempts) {
          reject(new Error(`MySQL hazır değil (${maxAttempts} deneme): ${host}:${n}`));
          return;
        }
        setTimeout(tryOnce, 1000);
      });
    };
    tryOnce();
  });
}

const defaults = {
  HARAPPE_DB_HOST: '127.0.0.1',
  HARAPPE_DB_PORT: '3307',
  HARAPPE_DB_DATABASE: 'harappe',
  HARAPPE_DB_USERNAME: 'harappe',
  HARAPPE_DB_PASSWORD: 'harappe_local_secret',
  HARAPPE_DB_CHARSET: 'utf8mb4',
  HARAPPE_DB_SSL: '0',
};

const fileEnv = loadEnvDocker();
const env = { ...process.env, ...defaults, ...fileEnv };

console.log(`MySQL bekleniyor: ${env.HARAPPE_DB_HOST}:${env.HARAPPE_DB_PORT} …`);
await waitPort(env.HARAPPE_DB_HOST, env.HARAPPE_DB_PORT);

const php = resolvePhpBinary();
const script = join(root, 'scripts', 'import-schema.php');
console.log(`Şema uygulanıyor: ${php} ${script}`);
const r = spawnSync(php, [script], { cwd: root, env, stdio: 'inherit' });
process.exit(r.status === 0 ? 0 : r.status ?? 1);
