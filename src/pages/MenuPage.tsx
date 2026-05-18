import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MenuItem } from '../types';
import { useCart, useAuth } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Coffee, RefreshCw, Search, X, Heart, Bean, Check, Info, Maximize2 } from 'lucide-react';
import { localDb } from '../lib/localDb';

import { getPlaceholderImage } from '../lib/imageUtils';
import LoadingView from '../components/LoadingView';
import { seedMenu } from '../lib/seedMenu';

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('Hepsi');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFeedback, setShowAddFeedback] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  const { cart, addToCart, updateQuantity } = useCart();
  const { profile } = useAuth();
  const table = localStorage.getItem('temp_table') || 'Takeaway';

  const getItemQuantity = (id: string) => {
    return cart.find(i => i.id === id)?.quantity || 0;
  };

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    setShowAddFeedback(item.id);
    setTimeout(() => setShowAddFeedback(null), 2000);
  };

  const toggleFavorite = (itemId: string) => {
    if (!profile) {
      alert('Favorilere eklemek için lütfen giriş yapın.');
      return;
    }
    void localDb.toggleFavorite(profile.uid, itemId);
  };

  const loadMenu = useCallback(async () => {
    try {
      let docs = await localDb.getMenu();
      if (docs.length === 0) {
        await seedMenu();
        docs = await localDb.getMenu();
      }
      setItems(docs);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Menü yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMenu();
    const handler = () => void loadMenu();
    window.addEventListener('menu_updated', handler);
    return () => window.removeEventListener('menu_updated', handler);
  }, [loadMenu]);

  const categories = useMemo(() => {
    const unique = [...new Set(items.map(i => i.category).filter(Boolean) as string[])];
    unique.sort((a, b) => a.localeCompare(b, 'tr'));
    return ['Hepsi', ...unique];
  }, [items]);

  useEffect(() => {
    if (filter !== 'Hepsi' && !categories.includes(filter)) {
      setFilter('Hepsi');
    }
  }, [categories, filter]);

  const filteredItems = items.filter(item => {
    const matchesCategory = filter === 'Hepsi' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = item.active !== false; // Default to true if active is undefined
    return matchesCategory && matchesSearch && isActive;
  });

  return (
    <div className="p-4 sm:p-6 relative overflow-x-hidden min-h-[calc(100vh+6rem)] pb-40">
      {/* Decorative Icons */}
      <div className="absolute top-40 -left-10 text-brand-primary/5 -rotate-12 pointer-events-none">
        <Coffee size={180} />
      </div>
      <div className="absolute bottom-20 -right-20 text-brand-primary/5 rotate-45 pointer-events-none">
        <Bean size={200} />
      </div>

      <header className="mb-6 sm:mb-8 relative z-10">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl">Menü</h1>
          <div className="bg-brand-primary/10 px-3 sm:px-4 py-1 rounded-full border border-brand-primary/20">
            <span className="text-[8px] sm:text-[10px] uppercase font-bold text-brand-primary max-w-[min(14rem,58vw)] text-right leading-tight break-words [overflow-wrap:anywhere] line-clamp-2">
              Masa {table}
            </span>
          </div>
        </div>

        <div className="relative mb-4 sm:mb-6">
          <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none text-brand-dark/20">
            <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          <input 
            type="text" 
            placeholder="KAHVE, TATLI..."
            className="w-full bg-white border-2 border-brand-dark/5 p-4 sm:p-5 pl-11 sm:pl-14 rounded-[1.5rem] sm:rounded-[2rem] font-display font-medium text-[10px] sm:text-[11px] uppercase tracking-widest focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/20 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-5 flex items-center text-brand-dark/20 hover:text-brand-primary transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-[10px] uppercase font-black tracking-widest whitespace-nowrap transition-all ${
                filter === cat 
                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                : 'bg-white text-brand-dark/40 hover:bg-brand-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
        {filteredItems.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="coffee-card overflow-hidden flex flex-col h-full bg-white relative scroll-mb-28"
          >
            {/* Image Section */}
            <div className="aspect-square relative flex-shrink-0 group cursor-pointer" onClick={() => setSelectedImage(item.image || getPlaceholderImage(item.name, item.category))}>
              <img 
                src={item.image || getPlaceholderImage(item.name, item.category)} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              
              {/* Price Pill */}
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm border border-brand-dark/5">
                ₺{(item.price || 0).toFixed(2)}
              </div>

              {/* Action Buttons on Image */}
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                  className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-75 shadow-sm ${
                    profile?.favorites?.includes(item.id) 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/80 text-brand-dark/40 hover:text-red-500'
                  }`}
                >
                  <Heart size={14} fill={profile?.favorites?.includes(item.id) ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                  className="p-2 rounded-full bg-white/80 backdrop-blur-md text-brand-dark/40 shadow-sm hover:text-brand-primary transition-colors"
                >
                  <Info size={14} />
                </button>
                <button 
                  className="p-2 rounded-full bg-white/80 backdrop-blur-md text-brand-dark/40 shadow-sm"
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(item.image || getPlaceholderImage(item.name, item.category)); }}
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="p-3 flex flex-col justify-between flex-1 relative">
              <AnimatePresence>
                {showAddFeedback === item.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: -30 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-0 right-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-lg z-20"
                  >
                    <Check size={8} /> +1
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-2">
                <h3 className="text-xs font-display font-black leading-tight uppercase line-clamp-2">{item.name}</h3>
              </div>
              
              <div className="mt-auto pt-2">
                <div className="text-[10px] font-black text-brand-primary mb-1 pl-1">
                  ₺{(item.price || 0).toFixed(2)}
                </div>
                <div className="flex items-center">
                  {getItemQuantity(item.id) > 0 ? (
                    <div className="flex items-center gap-2 bg-brand-muted/50 p-1 rounded-xl border border-brand-dark/5 flex-1">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm active:scale-90 transition-transform text-brand-primary"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-[10px] font-black font-display text-brand-dark flex-1 text-center">
                        {getItemQuantity(item.id)}
                      </span>
                      <button 
                        onClick={() => handleAddToCart(item)}
                        className="w-6 h-6 flex items-center justify-center bg-brand-primary text-white rounded-lg shadow-sm active:scale-90 transition-transform"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleAddToCart(item)}
                      className="w-full bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white py-2 rounded-xl active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest border border-brand-primary/20"
                    >
                      EKLE
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {error && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-[2.5rem] text-center mb-10">
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest"
            >
              YENİLE VE TEKRAR DENE
            </button>
          </div>
        )}

        {!loading && filteredItems.length === 0 && !error && (
          <div className="text-center py-20 px-6">
            <div className="bg-brand-primary/5 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
              {searchQuery ? <Search size={40} className="text-brand-primary/30" /> : <Coffee size={40} className="text-brand-primary/30" />}
            </div>
            <h3 className="text-3xl mb-3 tracking-tighter">
              {searchQuery ? "SONUÇ BULUNAMADI" : "MENÜ HAZIRLANIYOR"}
            </h3>
            <p className="text-brand-dark/40 font-display font-medium text-[10px] uppercase tracking-[0.2em] mb-10 max-w-[280px] mx-auto">
              {searchQuery 
                ? `"${searchQuery}" aramasına uygun bir lezzet bulamadık, başka bir şey denemek ister misin?` 
                : "Taze ürünlerimizi senin için hazırlıyoruz, birkaç saniye içinde burada olacaklar."}
            </p>
            
            {searchQuery ? (
              <button 
                onClick={() => setSearchQuery('')}
                className="px-8 py-4 bg-brand-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 active:scale-95 transition-all"
              >
                ARAMAYI TEMİZLE
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <LoadingView message="Lezzetler yükleniyor..." />
                <button 
                  onClick={() => seedMenu().then(() => window.location.reload())}
                  className="mt-4 px-6 py-3 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2"
                >
                  <RefreshCw size={14} className="animate-spin-slow" />
                  MENÜYÜ ŞİMDİ OLUŞTUR
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <LoadingView message="Espresso makinesini ısıtıyoruz..." />
      )}

      {/* Image Popup */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-xl"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full aspect-square"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-4 -right-4 bg-white text-brand-dark p-2 rounded-full shadow-xl z-20"
              >
                <X size={20} />
              </button>
              <img 
                src={selectedImage} 
                className="w-full h-full object-cover rounded-[2.5rem] shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-brand-dark/95 backdrop-blur-xl overflow-hidden"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-brand-cream w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto no-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-2 bg-brand-muted rounded-full z-10"
              >
                <X size={20} />
              </button>

              <div className="aspect-square w-32 h-32 rounded-[2rem] overflow-hidden mb-6 shadow-xl border-4 border-white mx-auto shrink-0">
                 <img 
                    src={selectedItem.image || getPlaceholderImage(selectedItem.name, selectedItem.category)} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
              </div>

              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-2 block">{selectedItem.category}</span>
                <h2 className="text-3xl font-display font-black uppercase mb-4 tracking-tighter leading-none">{selectedItem.name}</h2>
                <p className="text-brand-dark/60 text-xs leading-relaxed mb-8 font-medium">
                  {selectedItem.description}
                </p>
                
                <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-brand-dark/5 mb-8">
                  <span className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">Fiyat</span>
                  <span className="text-2xl font-display font-black text-brand-primary">₺{(selectedItem.price || 0).toFixed(2)}</span>
                </div>

                <button 
                  onClick={() => {
                    handleAddToCart(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="primary-btn w-full flex items-center justify-center gap-3 mb-2"
                >
                  <Plus size={20} /> SEPETE EKLE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
