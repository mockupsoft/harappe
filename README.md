# Harappe

Kahve / restoran siparişi: müşteri menü ve sepet, personel hazırlık ve yönetim ekranları (Türkçe arayüz).

**Yığın:** React 18, TypeScript, Vite 5, Tailwind v4, PHP + MySQL API (`api/`), oturum `harappe_session`.

**Kaynak kod:** [github.com/mockupsoft/harappe](https://github.com/mockupsoft/harappe)

---

## Yerelde çalıştırma

**Gereksinimler:** Node.js 18+ (öneri: 22), Laragon veya PHP 8.x + MySQL.

1. `npm install`
2. `.env.example` dosyasını `.env` olarak kopyala; `VITE_API_URL` için Laragon kökünü yaz (örn. `http://harappe.test/api`).
3. MySQL şeması: `php scripts/import-schema.php` (önce `api/config.local.php` veya ortam değişkenleriyle DB bilgisini ayarla).
4. `npm run dev` — varsayılan port `.env` içindeki `VITE_DEV_PORT` (örn. 5420).

İsteğe bağlı: `GEMINI_API_KEY` (`.env`).

---

## Docker ile yerel MySQL (Laragon MySQL’siz)

**Gereksinimler:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (veya Docker Engine + Compose).

1. `copy .env.docker.example .env.docker` (Windows PowerShell: `Copy-Item .env.docker.example .env.docker`) — isteğe bağlı; varsayılanlar zaten `import-schema-docker.mjs` içinde.
2. **`npm run db:docker:setup`** — MySQL’i `3307`’de başlatır, şemayı uygular ve **`api/config.local.php`** dosyasını Docker ayarlarına yazar (Laragon API aynı veritabanına bağlanır).

| Komut | Açıklama |
|-------|-----------|
| `npm run db:docker:up` | Sadece konteyner |
| `npm run db:docker:import` | Şemayı tekrar uygula |
| `npm run db:docker:config` | Yalnızca `config.local.php` ← Docker şablonu (`--force`) |
| `npm run db:docker:down` | Konteyneri durdur |

---

## Vercel’e deploy

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub’da `mockupsoft/harappe` deposunu bağla.
2. Build ayarları genelde otomatik algılanır (`npm run build`, çıktı `dist`). PHP uçları `vercel.json` içindeki **vercel-php** ile `api/*.php` olarak çalışır.
3. **Environment Variables** (Production / Preview ihtiyacına göre):

| Değişken | Açıklama |
|----------|-----------|
| `HARAPPE_DB_HOST` | Uzak MySQL sunucu adresi |
| `HARAPPE_DB_PORT` | Genelde `3306` |
| `HARAPPE_DB_DATABASE` | Veritabanı adı |
| `HARAPPE_DB_USERNAME` | Kullanıcı |
| `HARAPPE_DB_PASSWORD` | Şifre |
| `HARAPPE_DB_CHARSET` | İsteğe bağlı (`utf8mb4`) |
| `HARAPPE_DB_SSL` | `1` ise TLS (çoğu bulut MySQL için gerekli) |
| `HARAPPE_DB_SSL_CA` | İsteğe bağlı: CA dosya yolu veya PEM metni |
| `HARAPPE_ALLOWED_ORIGINS` | Özel alan adı kullanıyorsan tam URL’ler, virgülle |
| `VITE_API_URL` | Genelde **boş bırak**; uygulama aynı origin üzerinden `/api` kullanır |

MySQL Vercel üzerinde barındırılmaz; ücretsiz/ucuz seçenekler için kendi sağlayıcını (ör. bulut MySQL) kullan.

4. **Şema:** Sağlayıcı panelinde boş bir veritabanı oluştur. Ortamda `HARAPPE_DB_*` tanımlıyken yerelde `php scripts/import-schema.php` çalıştır → `database/schema-tables.sql` uygulanır. Laragon’da `HARAPPE_DB_HOST` yoksa tam kurulum için `database/schema.sql` kullanılır. Alternatif: phpMyAdmin / DBeaver ile `schema-tables.sql` içeriğini yapıştır.

> **Yerel MySQL’i Vercel’den “çekmek” mümkün değil** (Laragon/Docker sadece senin PC’nde). Canlı için **bulut MySQL** + Vercel’e env girmen gerekir. İsim listesi: [`.env.vercel.example`](.env.vercel.example) (değerleri panelde doldur, repoya şifre yazma).

---

## Komutlar

| Komut | Açıklama |
|-------|-----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run lint` | TypeScript kontrolü |
| `npm run smoke:api` | API duman testi (`API_BASE` veya `.env` içindeki `VITE_API_URL`) |
| `npm run db:docker:setup` | Docker MySQL + şema + Laragon `config.local.php` |
| `npm run db:docker:config` | Sadece API config’i Docker DB’ye yönlendir |
| `npm run verify:docker` | Konteyner + tablolar + PDO kontrolü |
