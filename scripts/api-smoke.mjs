/**
 * @license Apache-2.0
 * Harappe API smoke test — MySQL bağlantısı ve kullanıcı/admin ile örtüşen uçlar.
 * Kullanım: npm run smoke:api  veya  API_BASE=http://harappe.test/api node scripts/api-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readViteApiUrl() {
  const fromEnv = process.env.API_BASE || process.env.VITE_API_URL;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');

  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf8');
    for (const line of raw.split(/\n/)) {
      const t = line.trim();
      if (t.startsWith('#') || !t) continue;
      const m = t.match(/^VITE_API_URL=(.+)$/);
      if (m) {
        return m[1]
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/\/$/, '');
      }
    }
  } catch {
    /* yok */
  }
  return 'http://harappe.test/api';
}

const base = readViteApiUrl();

async function j(path, init) {
  const url = `${base}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${init?.method || 'GET'} ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('API base:', base);

  const health = await j('health.php');
  assert(health && health.ok === true && health.db === true, 'health: ok ve db true olmalı');
  console.log('OK health:', health.message || 'bağlandı');

  let menu;
  try {
    menu = await j('menu.php');
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes("doesn't exist") || msg.includes('42S02')) {
      console.error(
        'MySQL tabloları eksik. Laragon PHP ile şemayı içe aktarın:\n' +
          '  C:\\laragon\\bin\\php\\php-8.x\\php.exe scripts/import-schema.php\n' +
          'veya PATH\'te php varsa: npm run db:import'
      );
    }
    throw e;
  }
  assert(Array.isArray(menu), 'menu.php dizi dönmeli');
  console.log('OK menu.php count:', menu.length);

  const tables = await j('tables.php');
  assert(Array.isArray(tables), 'tables.php dizi dönmeli');
  console.log('OK tables.php count:', tables.length);

  const ordersBefore = await j('orders.php');
  assert(Array.isArray(ordersBefore), 'orders.php dizi dönmeli');
  console.log('OK orders.php count (önce):', ordersBefore.length);

  const testOrder = {
    id: `smoke_${Date.now()}`,
    tableNum: 'SmokeTest',
    customerId: null,
    customerName: 'Smoke',
    items: [{ id: 'x', name: 'Test', price: 1, quantity: 1, category: 'Test' }],
    total: 1,
    status: 'pending',
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
  };

  const created = await j('orders.php', {
    method: 'POST',
    body: JSON.stringify(testOrder),
  });
  assert(created && created.id === testOrder.id, 'POST sipariş id ile dönmeli');
  console.log('OK POST orders.php →', created.id);

  await j('orders.php', {
    method: 'PATCH',
    body: JSON.stringify({ id: testOrder.id, status: 'preparing' }),
  });
  console.log('OK PATCH orders.php → preparing');

  const ordersAfter = await j('orders.php');
  const patched = ordersAfter.find((o) => o.id === testOrder.id);
  assert(patched && patched.status === 'preparing', 'PATCH sonrası status preparing olmalı');
  console.log('OK sipariş durumu DB’de güncel');

  const profUid = 'smoke_profile_uid';
  await j('profiles.php', {
    method: 'PUT',
    body: JSON.stringify({
      uid: profUid,
      name: 'Smoke Profil',
      email: 'smoke@test.local',
      rewardPoints: 0,
      favorites: [],
      isAdmin: false,
    }),
  });
  const prof = await j(`profiles.php?uid=${encodeURIComponent(profUid)}`);
  assert(prof && prof.uid === profUid, 'profiles PUT/GET çalışmalı');
  console.log('OK profiles.php kullanıcı tarafı (GET/PUT)');

  await j('logs.php', {
    method: 'POST',
    body: JSON.stringify({
      id: `smoke_log_${Date.now()}`,
      itemId: 'smoke',
      itemName: 'Smoke log',
      oldPrice: 1,
      newPrice: 2,
      changedBy: 'smoke',
      type: 'individual',
      timestamp: { seconds: Math.floor(Date.now() / 1000) },
    }),
  });
  const logs = await j('logs.php');
  assert(Array.isArray(logs) && logs.length > 0, 'logs.php POST/GET');
  console.log('OK logs.php (admin fiyat logu)');

  console.log('\nTüm API smoke kontrolleri geçti.');
  console.log('Manuel UI: menü/sepet/OrderStatus, Admin sekmeleri, PrepScreen durum butonları tarayıcıda teyit edin.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
