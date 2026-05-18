import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, useAuth } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronLeft, CreditCard, Trash2, Plus, Minus, Gift, Coffee, Info, X, CheckCircle2, Zap, Bean, Search, MapPin } from 'lucide-react';
import { localDb } from '../lib/localDb';
import LoadingView from '../components/LoadingView';
import { Table } from '../types';

export default function CartPage() {
  const { cart, total, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const table = localStorage.getItem('temp_table') || 'Takeaway';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [useReward, setUseReward] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState(table);
  const [tableSearch, setTableSearch] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);

  useEffect(() => {
    void localDb.getTables().then(setTables).catch(e => console.error('Masalar yüklenemedi:', e));
  }, []);

  const rewardThreshold = 5;
  const isRewardEligible = (profile?.rewardPoints || 0) >= rewardThreshold;

  // Most expensive item is free if reward is used
  const discountAmount = (useReward && cart.length > 0) ? Math.max(...cart.map(i => i.price || 0)) : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || prev.name,
        email: profile.email || prev.email,
        phone: profile.phone || prev.phone,
        address: profile.address || prev.address
      }));
    }
  }, [profile]);

  if (authLoading) return <LoadingView fullScreen message="Sepetin hazırlanıyor..." />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const freeItem = useReward ? [...cart].sort((a, b) => (b.price || 0) - (a.price || 0))[0] : null;

      const orderData = {
        tableNum: selectedTable,
        customerId: user?.uid || null,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        notes: formData.notes,
        items: cart,
        total: finalTotal,
        discount: discountAmount,
        freeItemId: freeItem?.id || null,
        status: 'pending' as const
      };

      const newOrder = await localDb.addOrder(orderData);
      
      // Always use fresh profile from localDb to update points
      if (user) {
        const currentProfile = await localDb.getProfile(user.uid);
        if (currentProfile) {
          let newPoints = currentProfile.rewardPoints || 0;
          if (useReward) {
            newPoints -= rewardThreshold;
          }
          // Always add 1 point per order
          newPoints += 1;

          await localDb.saveProfile({
            ...currentProfile,
            rewardPoints: newPoints
          });
        }
      }

      clearCart();
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/order-status/${newOrder.id}`);
      }, 3000);
    } catch (error) {
      console.error(error);
      alert('Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 relative overflow-x-hidden min-h-[calc(100vh+12rem)] pb-52">
        {/* Decorative Icons */}
        <div className="absolute top-1/2 -right-10 text-brand-primary/5 -rotate-12 pointer-events-none">
          <Coffee size={200} />
        </div>
        <div className="absolute top-20 -left-10 text-brand-primary/5 rotate-45 pointer-events-none">
          <Bean size={120} />
        </div>

        <header className="flex items-center gap-4 mb-6 sm:mb-8 relative z-10">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl sm:text-3xl">Sepetim</h1>
      </header>

      {cart.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-white p-8 rounded-full inline-block mb-6 shadow-sm">
            <ShoppingBag size={56} className="text-brand-primary/20" />
          </div>
          <p className="text-brand-dark/40 font-display font-medium uppercase tracking-widest text-[10px]">Sepetin şu an boş görünüyor.</p>
          <button onClick={() => navigate('/menu')} className="mt-6 text-brand-primary font-black uppercase tracking-widest text-xs border-b-2 border-brand-primary pb-1">
            Menüye Göz At
          </button>
        </div>
      ) : (
        <div className="grid gap-8">
          {/* Cart Items */}
          <section className="space-y-4">
            {/* Table Selection Display */}
            <div className="coffee-card p-6 flex items-center justify-between gap-4 bg-white/50 backdrop-blur-md min-w-0">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary shrink-0">
                  <MapPin size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark/30">Seçili Masa</p>
                  <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-tight break-words [overflow-wrap:anywhere] line-clamp-2 leading-snug">
                    {selectedTable}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowTableModal(true)}
                className="px-6 py-3 bg-brand-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-dark/20"
              >
                DEĞİŞTİR
              </button>
            </div>

            {cart.map(item => (
              <div key={item.id} className="coffee-card p-4 flex gap-4">
                <img src={item.image} className="w-20 h-20 object-cover rounded-2xl" referrerPolicy="no-referrer" />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-black text-lg uppercase tracking-tight">{item.name}</h3>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500/50 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-brand-dark/80 tracking-tight">₺{((item.price || 0) * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center gap-3 bg-brand-muted px-4 py-1.5 rounded-2xl">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-brand-primary hover:scale-125 transition-transform"><Minus size={14} strokeWidth={3} /></button>
                      <span className="text-xs font-black min-w-[24px] text-center font-display">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-brand-primary hover:scale-125 transition-transform"><Plus size={14} strokeWidth={3} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Checkout Form */}
          <section className="coffee-card p-6">
            <h2 className="text-xl mb-4 flex items-center gap-2">
              <CreditCard size={20} /> Ödeme Detayları
            </h2>
            
            {!user ? (
              <div className="bg-brand-primary/5 p-8 rounded-[2rem] text-center border border-brand-primary/10">
                <Coffee size={40} className="text-brand-primary/40 mx-auto mb-4" />
                <h3 className="text-lg mb-2">SİPARİŞ VERMEK İÇİN GİRİŞ YAPIN</h3>
                <p className="text-[10px] text-brand-dark/40 uppercase font-bold tracking-widest mb-6">Puan kazanmak ve siparişini tamamlamak için hesabına erişmen gerekiyor.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => navigate('/login')} className="primary-btn py-3">GİRİŞ YAP</button>
                  <button onClick={() => navigate('/login')} className="text-brand-primary font-black text-[10px] uppercase tracking-widest hover:underline">Veya Şimdi Kayıt Ol</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                  required 
                  placeholder="Adın Soyadın" 
                  className="w-full bg-brand-cream p-3 rounded-xl border-none font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                  required 
                  type="email"
                  placeholder="E-posta Adresin" 
                  className="w-full bg-brand-cream p-3 rounded-xl border-none font-medium text-brand-dark/50"
                  value={formData.email}
                  readOnly
                />
                <input 
                  required 
                  placeholder="Telefon Numaran" 
                  className="w-full bg-brand-cream p-3 rounded-xl border-none font-medium"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 px-2 flex items-center gap-2">
                    <Coffee size={12} /> Özel İsteklerin (Opsiyonel)
                  </label>
                  <textarea 
                    placeholder="Süt miktarı, alerji bilgisi, paket tercihi..." 
                    className="w-full bg-brand-cream p-4 rounded-[2rem] border-none h-28 resize-none font-medium focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                
                <div className="pt-4 border-t border-brand-dark/10 space-y-2 text-brand-dark/40 uppercase font-black tracking-widest text-[10px]">
                  <div className="flex justify-between text-brand-dark/40 font-bold uppercase tracking-widest text-[10px]">
                    <span>Ara Toplam</span>
                    <span>₺{(total || 0).toFixed(2)}</span>
                  </div>
                  {useReward && (
                    <div className="flex justify-between text-green-600 font-bold uppercase tracking-widest text-[10px]">
                      <span>Hediye Kahve İndirimi</span>
                      <span>-₺{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-2xl font-display font-black tracking-tight pt-2">
                    <span>Toplam</span>
                    <span>₺{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {isRewardEligible && (
                  <div className="relative">
                    <div className={`p-4 rounded-3xl flex items-center justify-between transition-all duration-500 border-2 ${useReward ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-primary/5 border-brand-primary/10 text-brand-primary'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${useReward ? 'bg-white/20' : 'bg-brand-primary/10'}`}>
                          <Gift size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">Hediye Kahve Hazır!</p>
                          <p className="text-[10px] opacity-80 uppercase font-medium tracking-widest">{profile?.rewardPoints} Puanın Var</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => setShowInfo(!showInfo)}
                          className={`transition-opacity ${useReward ? 'text-white/40 hover:text-white' : 'text-brand-primary/40 hover:text-brand-primary'}`}
                        >
                          <Info size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setUseReward(!useReward)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${useReward ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'}`}
                        >
                          {useReward ? 'VAZGEÇ' : 'KULLAN'}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showInfo && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-xl"
                          onClick={() => setShowInfo(false)}
                        >
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-brand-dark max-w-sm w-full relative"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex justify-between items-start mb-6">
                              <h4 className="font-display font-black uppercase tracking-tight text-xl">Puan Avantajı</h4>
                              <button onClick={() => setShowInfo(false)} className="text-brand-dark/20 hover:text-brand-primary p-1"><X size={20} /></button>
                            </div>
                            <p className="text-xs font-bold uppercase tracking-tight text-brand-dark/60 leading-relaxed mb-8 font-medium">
                              Her 5 siparişte 1 bedava kahve kazanırsın. Puanını kullandığında sepetindeki en yüksek fiyatlı ürün tamamen ücretsiz olur!
                            </p>
                            <button 
                              onClick={() => setShowInfo(false)}
                              className="w-full py-4 bg-brand-muted rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all"
                            >
                              ANLADIM
                            </button>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full primary-btn mt-10 scroll-mb-40 mb-28"
                >
                  {loading ? 'İşleniyor...' : `Siparişi Tamamla • ₺${finalTotal.toFixed(2)}`}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
      <TableModal 
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        tables={tables}
        onSelect={setSelectedTable}
        search={tableSearch}
        onSearchChange={setTableSearch}
      />
    </div>
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-brand-primary flex items-center justify-center p-6 text-center text-white"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                  className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center text-brand-primary shadow-2xl"
                >
                  <CheckCircle2 size={64} />
                </motion.div>
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-4 -right-4 bg-yellow-400 p-3 rounded-2xl shadow-xl text-brand-dark"
                >
                  <Zap size={24} />
                </motion.div>
              </div>

              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-display font-black uppercase tracking-tighter mb-4"
              >
                SİPARİŞ ALINDI!
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs font-black uppercase tracking-[0.3em] opacity-80 mb-8 max-w-[240px] leading-relaxed"
              >
                Kahvelerin demlenmeye başlıyor. Tadını çıkarmaya hazır mısın?
              </motion.p>

              <div className="h-1 bg-white/20 rounded-full w-full max-w-[200px] overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 2.5, ease: 'linear' }}
                  className="h-full bg-white rounded-full w-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Table Selection Modal Component
function TableModal({ 
  isOpen, 
  onClose, 
  tables, 
  onSelect, 
  search, 
  onSearchChange 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  tables: Table[]; 
  onSelect: (name: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
}) {
  const filteredTables = tables.filter(t => t.active && t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-brand-dark/95 backdrop-blur-xl p-4 md:p-6 flex items-center justify-center overflow-y-auto"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg relative my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block mb-1">Konumunu Seç</span>
                <h2 className="text-2xl font-display font-black tracking-tight uppercase">MASA SEÇİMİ</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-brand-muted rounded-full hover:bg-brand-primary/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-6">
              <input 
                type="text"
                placeholder="Masa Ara (Örn: Tokyo)..."
                className="w-full bg-brand-muted px-6 py-4 rounded-2xl border-none font-bold text-xs uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                autoFocus
              />
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-dark/20" size={18} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
              <button 
                onClick={() => { onSelect('Takeaway'); onClose(); }}
                className="p-4 rounded-2xl border-2 border-dashed border-brand-dark/10 flex flex-col items-center gap-2 hover:border-brand-primary hover:bg-brand-primary/5 transition-all group"
              >
                <div className="w-10 h-10 bg-brand-muted rounded-xl flex items-center justify-center text-brand-dark/20 group-hover:bg-brand-primary/10 group-hover:text-brand-primary">
                  <Coffee size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">AL-GÖTÜR</span>
              </button>

              {filteredTables.map(t => (
                <button 
                  key={t.id}
                  onClick={() => { onSelect(t.name); onClose(); }}
                  className="p-4 rounded-2xl border-2 border-transparent bg-brand-muted hover:bg-brand-primary/10 hover:text-brand-primary transition-all group relative overflow-hidden"
                >
                  {t.image && (
                    <img src={t.image} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">{t.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
