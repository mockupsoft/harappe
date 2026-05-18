/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LegalDocument {
  id: string;
  title: string;
  /** Paragraflar `\n\n` ile ayrılır */
  body: string;
}

/** Yasal metin taslakları — yayına çıkmadan hukuki danışmanlıkla güncellenmelidir. */
export const legalDocuments: LegalDocument[] = [
  {
    id: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    body:
      'Bu metin örnektir ve hukuki danışmanlık yerine geçmez.\n\n' +
      'Veri sorumlusu olarak işletmemiz, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizi; siparişin işlenmesi, müşteri desteği ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işleyebilir.\n\n' +
      'İletişim ve hesap bilgileriniz yalnızca bu amaçlarla sınırlı tutulur; haklarınız (bilgi talebi, düzeltme, silme vb.) için bizimle iletişime geçebilirsiniz.',
  },
  {
    id: 'terms',
    title: 'Kullanım Koşulları',
    body:
      'Uygulamayı kullanarak bu koşulları kabul etmiş sayılırsınız.\n\n' +
      'Menü fiyatları ve ürün bilgileri önceden haber verilmeksizin değişebilir. Siparişler işletme onayı ve stok durumuna bağlıdır.\n\n' +
      'Hesap güvenliğinden kullanıcı sorumludur; şüpheli kullanımda hesabınız askıya alınabilir.',
  },
  {
    id: 'distance-sales',
    title: 'Mesafeli Satış Sözleşmesi Özeti',
    body:
      'Bu özet bilgilendirme amaçlıdır; tam sözleşme metni sipariş akışında veya talep üzerine sunulabilir.\n\n' +
      'Tüketici, cayma hakkına ilişkin istisnalar dahilinde ilgili mevzuat çerçevesinde haklarına sahiptir.\n\n' +
      'Ödeme ve teslimat koşulları sipariş sırasında bildirilen şekilde geçerlidir.',
  },
  {
    id: 'cookies',
    title: 'Çerez ve Yerel Veri',
    body:
      'Uygulama, oturum ve tercihlerinizi hatırlamak için tarayıcıda yerel depolama veya benzeri teknolojiler kullanabilir.\n\n' +
      'Zorunlu çerezler hizmetin çalışması için gereklidir; üçüncü taraf çerezleri kullanılıyorsa ayrıca bilgilendirilirsiniz.',
  },
];
