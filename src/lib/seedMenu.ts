import { localDb } from './localDb';

const INITIAL_MENU = [
  {
    name: 'Vanilyalı Yulaf Latte',
    description: 'Madagaskar vanilya çubuğu şurubu, ipeksi espresso ve kremsi yulaf sütüyle hazırlanan favorimiz.',
    price: 185.00,
    category: 'Sıcak Kahveler',
    image: 'https://picsum.photos/seed/coffee-latte/600/600',
    active: true
  },
  {
    name: 'Flat White',
    description: 'Ristretto espressonun ipeksi kadifemsi süt köpüğüyle birleşimi. Yoğun kahve tadı arayanlar için.',
    price: 145.00,
    category: 'Sıcak Kahveler',
    image: 'https://picsum.photos/seed/flat-white/600/600',
    active: true
  },
  {
    name: 'Cortado',
    description: 'Eşit oranda espresso ve sütün mükemmel uyumu. Kısa ve etkili bir klasik.',
    price: 135.00,
    category: 'Sıcak Kahveler',
    image: 'https://picsum.photos/seed/cortado/600/600',
    active: true
  },
  {
    name: 'Karamel Macchiato',
    description: 'Vanilya şurubuyla tatlandırılmış taze süt, üzerine eklenen espresso ve nefis karamel sos dokunuşu.',
    price: 195.75,
    category: 'Sıcak Kahveler',
    image: 'https://picsum.photos/seed/coffee-caramel/600/600',
    active: true
  },
  {
    name: 'Buzlu Antep Fıstıklı Latte',
    description: 'Antep fıstığının doğal aroması, espresso ve buz gibi sütle birleşiyor. Hem tatlı hem ferah bir seçenek.',
    price: 215.25,
    category: 'Soğuk Kahveler',
    image: 'https://picsum.photos/seed/iced-pistachio/600/600',
    active: true
  },
  {
    name: 'Tatlı Kremalı Cold Brew',
    description: '24 saat boyunca soğuk demlenmiş kahve, üzerine eklediğimiz el yapımı vanilyalı tatlı krema ile taçlanıyor.',
    price: 175.25,
    category: 'Soğuk Kahveler',
    image: 'https://picsum.photos/seed/cold-brew/600/600',
    active: true
  },
  {
    name: 'Karamel Frappé',
    description: 'Buzlu, karamel soslu ve sütlü dondurulmuş kahve keyfi üzerine çırpılmış krema ile.',
    price: 185.00,
    category: 'Soğuk Kahveler',
    image: 'https://picsum.photos/seed/frappe/600/600',
    active: true
  },
  {
    name: 'Buzlu Americano',
    description: 'Ferahlatıcı soğuk su ve double shot espressonun buzlarla dansı.',
    price: 135.00,
    category: 'Soğuk Kahveler',
    image: 'https://picsum.photos/seed/iced-americano/600/600',
    active: true
  },
  {
    name: 'Tereyağlı Kruvasan',
    description: 'Dışı çıtır çıtır, içi yumuşacık ve mis gibi tereyağı kokulu klasik Fransız lezzeti.',
    price: 125.50,
    category: 'Fırından',
    image: 'https://picsum.photos/seed/croissant/600/600',
    active: true
  },
  {
    name: 'Belçika Çikolatalı Brownie',
    description: 'İçi ıslak, yoğun Bitter Belçika çikolatalı ve cevizli özel tarifimiz.',
    price: 145.00,
    category: 'Fırından',
    image: 'https://picsum.photos/seed/brownie/600/600',
    active: true
  },
  {
    name: 'Havuçlu Kek',
    description: 'Cevizli, tarçınlı ve krem peynir dolgulu, klasik ev yapımı sıcaklıkta bir lezzet.',
    price: 135.00,
    category: 'Fırından',
    image: 'https://picsum.photos/seed/carrot-cake/600/600',
    active: true
  },
  {
    name: 'Limonlu Cheesecake',
    description: 'Taze limon aromalı, kremsi ve hafif bir tatlı. Çıtır tabanıyla harmanlanmış.',
    price: 165.00,
    category: 'Fırından',
    image: 'https://picsum.photos/seed/cheesecake/600/600',
    active: true
  },
  {
    name: 'Avokadolu Yumurtalı Tartin',
    description: 'Kızarmış ekşi mayalı ekmek üzerinde ezilmiş avokado, poşe yumurta ve taze yeşillikler.',
    price: 285.50,
    category: 'Kahvaltı',
    image: 'https://picsum.photos/seed/avocado-egg/600/600',
    active: true
  },
  {
    name: 'Kruvasan Sandviç',
    description: 'Çırpılmış yumurta, füme antrikot ve cheddar peyniri ile zenginleştirilmiş gurme seçim.',
    price: 265.00,
    category: 'Kahvaltı',
    image: 'https://picsum.photos/seed/croissant-sandwich/600/600',
    active: true
  },
  {
    name: 'Açai Meyve Kasesi',
    description: 'Soğuk açai bazı üzerinde glütensiz granola, muz, taze böğürtlenler ve badem ezmesi.',
    price: 295.00,
    category: 'Kahvaltı',
    image: 'https://picsum.photos/seed/acai-bowl/600/600',
    active: true
  },
  {
    name: 'Matcha Latte',
    description: 'Seremoniyel kalitede matcha tozunun dilediğin süt çeşidiyle buluştuğu dinlendirici bir lezzet.',
    price: 185.50,
    category: 'Kahve Dışı',
    image: 'https://picsum.photos/seed/matcha/600/600',
    active: true
  },
  {
    name: 'Sıcak Çikolata',
    description: 'Yoğun Belçika çikolatası, süt ve marshmallow eşliğinde hazırlanan kış favorisi.',
    price: 175.00,
    category: 'Kahve Dışı',
    image: 'https://picsum.photos/seed/hot-chocolate/600/600',
    active: true
  },
  {
    name: 'Hibiscus Soğuk Çay',
    description: 'Ev yapımı hibiskus, taze nane ve orman meyveli, şeker ilavesiz ferahlık.',
    price: 155.00,
    category: 'Kahve Dışı',
    image: 'https://picsum.photos/seed/iced-tea/600/600',
    active: true
  }
];

export const seedMenu = async () => {
  console.log('--- Storage Seed Started ---');
  try {
    const existingMenu = await localDb.getMenu();
    
    if (existingMenu.length === 0) {
      console.log('Storage empty, seeding items...');
      const menuWithIds = INITIAL_MENU.map(item => ({
        ...item,
        id: item.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        active: true,
        createdAt: new Date()
      }));
      
      await localDb.saveMenu(menuWithIds);
      console.log('--- Storage Seed Finished ---');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
};
