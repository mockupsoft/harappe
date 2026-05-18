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

---

## Komutlar

| Komut | Açıklama |
|-------|-----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run lint` | TypeScript kontrolü |
| `npm run smoke:api` | API duman testi (`API_BASE` veya `.env` içindeki `VITE_API_URL`) |
