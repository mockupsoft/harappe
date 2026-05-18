/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * harappe.com ana sayfa HTML'inden menüyü çıkarır, görselleri public/menu/ altına indirir,
 * VITE_API_URL hedefine menu.php PUT ile yazar.
 *
 * Kullanım (repo kökünden):
 *   npm run import-menu
 *
 * Ortam:
 *   VITE_API_URL — .env veya export (örn. http://harappe.test/api)
 *   HARAPPE_SOURCE_URL — isteğe bağlı, varsayılan https://harappe.com/
 *   DRY_RUN=1 — yalnızca ayrıştırma; indirme ve PUT yok
 *   SKIP_RESET_LEGACY=1 — menü yazdıktan sonra sipariş/favori sıfırlamayı atla
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { resolvePhpBinary } from './resolve-php.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_MENU = join(ROOT, 'public', 'menu');
const PLACEHOLDER_SVG = join(PUBLIC_MENU, 'placeholder.svg');
const DEFAULT_SOURCE = 'https://harappe.com/';
const DOWNLOAD_ATTEMPTS = 3;

function loadEnvFile() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return {};
  const text = readFileSync(p, 'utf8');
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function slugifyTr(name) {
  let s = name.toLocaleLowerCase('tr-TR');
  const map = {
    ğ: 'g',
    ü: 'u',
    ş: 's',
    ı: 'i',
    ö: 'o',
    ç: 'c',
    â: 'a',
    î: 'i',
    û: 'u',
    é: 'e',
    à: 'a',
    è: 'e',
    ù: 'u',
    ô: 'o',
    ñ: 'n',
  };
  let ascii = '';
  for (const ch of s) {
    ascii += map[ch] ?? ch;
  }
  return ascii
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'urun';
}

function parsePrice(text) {
  const t = text.replace(/\s/g, '').replace(/₺/g, '');
  const m = t.match(/(\d+)[,.](\d{2})/);
  if (m) return parseFloat(`${m[1]}.${m[2]}`);
  const n = t.match(/^\d+/);
  return n ? parseFloat(n[0]) : 0;
}

function parseSections(html) {
  const blocks = html.split(/(?=<div id="bolum-kategori-\d+")/);
  const out = [];
  for (const block of blocks) {
    if (!/id="bolum-kategori-\d+"/.test(block)) continue;
    const idM = block.match(/id="bolum-kategori-(\d+)"/);
    if (!idM) continue;
    const h2m = block.match(/<h2[^>]*>([^<]+)<\/h2>/);
    const category = h2m ? h2m[1].trim() : `Kategori ${idM[1]}`;
    const products = [];
    const cardRe =
      /<div class="product-card"[\s\S]*?<img[^>]*\sdata-src="([^"]+)"[\s\S]*?<div class="card-info"><h3>([^<]+)<\/h3><span class="price">([^<]+)<\/span>/g;
    let m;
    while ((m = cardRe.exec(block)) !== null) {
      const imagePath = m[1].trim();
      const name = m[2].trim();
      const price = parsePrice(m[3]);
      products.push({ imagePath, name, price });
    }
    out.push({ category, products });
  }
  return out;
}

function uniqueSlug(base, used) {
  let s = base;
  let n = 2;
  while (used.has(s)) {
    s = `${base}-${n}`;
    n += 1;
  }
  used.add(s);
  return s;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'HarappeMenuImport/1.0 (internal; +https://harappe.com)' },
  });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

async function downloadFile(url, destPath) {
  let lastErr;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'HarappeMenuImport/1.0 (internal; +https://harappe.com)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 64) throw new Error('dosya çok küçük');
      writeFileSync(destPath, buf);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < DOWNLOAD_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }
  throw lastErr ?? new Error('indirilemedi');
}

/** Yerel placeholder kullan (uzak URL menüde saklanmaz). */
function ensurePlaceholderExists() {
  if (!existsSync(PLACEHOLDER_SVG)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect fill="#1a1a1a" width="600" height="600"/><text x="300" y="310" fill="#555" text-anchor="middle" font-size="22" font-family="system-ui,sans-serif">Harappe</text></svg>`;
    mkdirSync(PUBLIC_MENU, { recursive: true });
    writeFileSync(PLACEHOLDER_SVG, svg, 'utf8');
  }
}

function useLocalPlaceholder(menuItemId, dry) {
  const fallbackName = `${menuItemId}-placeholder.svg`;
  const destSvg = join(PUBLIC_MENU, fallbackName);
  if (!dry) {
    ensurePlaceholderExists();
    copyFileSync(PLACEHOLDER_SVG, destSvg);
  }
  return `/menu/${fallbackName}`;
}

function resolveImageUrl(sourceBase, path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = sourceBase.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${base}/${p}`;
}

async function main() {
  const fileEnv = loadEnvFile();
  const apiBase = (process.env.VITE_API_URL || fileEnv.VITE_API_URL || '').replace(/\/$/, '');
  const sourceBase = (process.env.HARAPPE_SOURCE_URL || DEFAULT_SOURCE).replace(/\/$/, '');
  const indexUrl = sourceBase.endsWith('/') ? sourceBase : `${sourceBase}/`;
  const dry = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

  console.log('Kaynak:', indexUrl);
  if (dry) console.log('DRY_RUN: görseller ve PUT atlanacak.');

  const html = await fetchText(indexUrl);
  const sections = parseSections(html);
  let total = 0;
  for (const s of sections) total += s.products.length;
  if (total === 0) {
    console.error('Ürün bulunamadı; HTML yapısı değişmiş olabilir.');
    process.exit(1);
  }
  console.log(`${sections.length} kategori, ${total} ürün ayrıştırıldı.`);

  if (!dry) {
    mkdirSync(PUBLIC_MENU, { recursive: true });
  }

  const slugUsed = new Set();
  const menuItems = [];

  for (const section of sections) {
    for (const p of section.products) {
      const baseSlug = slugifyTr(p.name);
      const id = uniqueSlug(baseSlug, slugUsed);
      const srcUrl = resolveImageUrl(sourceBase, p.imagePath);
      const origExt = extname(p.imagePath).toLowerCase() || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(origExt) ? origExt : '.jpg';
      const localName = `${id}${safeExt}`;
      const publicPath = `/menu/${localName}`;

      /** Görseller her zaman bizde: başarılı indirme veya yerel placeholder kopyası */
      let image = publicPath;
      if (!dry) {
        ensurePlaceholderExists();
        const dest = join(PUBLIC_MENU, localName);
        try {
          await downloadFile(srcUrl, dest);
          console.log('İndirildi:', localName);
        } catch (e) {
          console.warn('Görsel indirilemedi, placeholder kullanılıyor:', localName, e.message);
          image = useLocalPlaceholder(id, dry);
          console.warn('→', image);
        }
      }

      menuItems.push({
        id,
        name: p.name,
        description: '',
        price: p.price,
        category: section.category,
        image,
        active: true,
      });
    }
  }

  if (dry) {
    console.log('Örnek:', JSON.stringify(menuItems.slice(0, 2), null, 2));
    console.log('DRY_RUN bitti.');
    return;
  }

  if (!apiBase) {
    console.error('VITE_API_URL tanımlı değil (.env veya ortam). Görseller public/menu altına yazıldı; DB yazılamadı.');
    process.exit(1);
  }

  const putUrl = `${apiBase}/menu.php`;
  const res = await fetch(putUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menuItems),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('menu.php PUT hatası:', res.status, text);
    process.exit(1);
  }
  console.log('menu.php güncellendi:', putUrl, text);

  if (process.env.SKIP_RESET_LEGACY === '1' || process.env.SKIP_RESET_LEGACY === 'true') {
    console.log('SKIP_RESET_LEGACY: sipariş/favori sıfırlaması atlandı.');
    return;
  }

  const phpBin = resolvePhpBinary();
  const resetScript = join(ROOT, 'scripts', 'reset-legacy-data.php');
  try {
    console.log('Eski siparişler ve favoriler sıfırlanıyor:', resetScript);
    execFileSync(phpBin, [resetScript], { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    console.warn('reset-legacy-data.php çalıştırılamadı:', e.message);
    console.warn('Manuel: npm run reset-legacy veya PHP_BINARY ile tam yol.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
