import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Order, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../App';
import { Clock, Coffee, Package, CheckCircle2, ChevronRight, Ban, Bean, Filter, Ticket, AlertTriangle, Zap, X } from 'lucide-react';
import LoadingView from '../components/LoadingView';
import { localDb } from '../lib/localDb';

type PrepTab = 'all' | 'pending' | 'active' | 'completed';

export default function PrepScreenPage() {
  const { profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PrepTab>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ordersPerPage = 6;

  const loadOrders = useCallback(async () => {
    try {
      const data = await localDb.getOrders();
      setOrders([...data].reverse());
    } catch (e) {
      console.error('Siparişler yüklenemedi:', e);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const handler = () => void loadOrders();
    window.addEventListener('orders_updated', handler);

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // Check every 10 seconds

    const pollOrders = setInterval(() => {
      void loadOrders();
    }, 15000); // Başka sekme/cihazdan gelen siparişler için API yenilemesi

    return () => {
      window.removeEventListener('orders_updated', handler);
      clearInterval(interval);
      clearInterval(pollOrders);
    };
  }, [loadOrders]);

  const playNotification = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        console.log('Ses çalınamadı (etkileşim gerekli):', e);
        setSoundEnabled(false);
      });
    } catch (err) {
      console.error('Notification error:', err);
    }
  };

  const toggleSound = () => {
    if (!soundEnabled) {
      const dummyAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      dummyAudio.volume = 0;
      dummyAudio.play().then(() => {
        setSoundEnabled(true);
        playNotification();
      }).catch(e => {
        alert('Tarayıcınız ses çalmaya izin vermiyor. Lütfen adres çubuğundaki kilit simgesine tıklayıp ses izinlerini kontrol edin.');
      });
    } else {
      setSoundEnabled(false);
    }
  };

  // Check for delayed orders and alert
  useEffect(() => {
    if (!soundEnabled) return;
    
    const hasDelayed = orders.some(o => {
      if (o.status !== 'pending') return false;
      const orderTime = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
      const diffMinutes = (currentTime - orderTime) / 1000 / 60;
      return diffMinutes > 5;
    });

    if (hasDelayed) {
      playNotification();
    }
  }, [currentTime, orders, soundEnabled]);

  if (authLoading) return <LoadingView fullScreen message="Mutfak paneli yükleniyor..." />;

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await localDb.updateOrderStatus(orderId, status);
    setConfirmCancel(null);
  };

  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-orange-100 text-orange-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const filteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return orders.filter(o => o.status === 'pending');
      case 'active':
        return orders.filter(o => o.status === 'preparing' || o.status === 'ready');
      case 'completed':
        return orders.filter(o => o.status === 'completed' || o.status === 'cancelled');
      default:
        return orders;
    }
  }, [orders, activeTab]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const activeCount = orders.filter(o => o.status === 'preparing' || o.status === 'ready').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-32 relative overflow-x-hidden min-h-screen">
      {/* Decorative Icons */}
      <div className="absolute top-0 right-0 text-brand-primary/5 -rotate-12 pointer-events-none">
        <Coffee size={400} />
      </div>
      <div className="absolute bottom-0 left-0 text-brand-primary/5 rotate-12 pointer-events-none">
        <Bean size={200} />
      </div>
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8 relative z-10">
        <div>
          <h1 className="text-4xl tracking-tighter">HAZIRLIK PANELİ</h1>
          <div className="flex gap-4 mt-2 mb-4">
            <p className="text-brand-dark/40 font-display font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              {pendingCount} Bekleyen
            </p>
            <p className="text-brand-dark/40 font-display font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {activeCount} Aktif
            </p>
          </div>
          <button 
            onClick={toggleSound}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all w-fit ${
              soundEnabled ? 'bg-green-500 text-white shadow-sm' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }`}
            title={soundEnabled ? 'Sesi Kapa' : 'Sesi Aç (Gecikme Uyarıları İçin)'}
          >
            {soundEnabled ? <Zap size={14} className="animate-pulse" /> : <X size={14} />}
            <span>SES {soundEnabled ? 'AÇIK' : 'KAPALI'}</span>
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-brand-muted p-1 rounded-2xl md:rounded-3xl shadow-sm border border-brand-dark/5">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'pending' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            BEKLEYEN ({pendingCount})
          </button>
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'active' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            AKTİF ({activeCount})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'completed' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            TAMAMLANAN
          </button>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
        <AnimatePresence mode="popLayout">
          {paginatedOrders.length > 0 ? (
            paginatedOrders.map((order) => {
              const orderTime = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now();
              const diffMinutes = (currentTime - orderTime) / 1000 / 60;
              const isDelayed = order.status === 'pending' && diffMinutes > 5;

              return (
              <motion.div
                key={order.id}
                layout
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`bg-white rounded-[2.5rem] p-7 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.05)] border-2 flex flex-col h-full transition-colors ${isDelayed ? 'border-red-500 bg-red-50/30' : 'border-transparent'}`}
              >
                <div className="flex flex-wrap items-center gap-3 mb-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-display font-black uppercase tracking-tight min-w-0 flex-1 break-words [overflow-wrap:anywhere] line-clamp-2 leading-tight">
                    {order.tableNum}
                  </h3>
                  <span className={`text-[10px] md:text-[11px] uppercase px-3 py-1 rounded-full font-black tracking-tight ${statusColors[order.status]}`}>
                    {order.status === 'pending' ? 'Beklemede' : 
                      order.status === 'preparing' ? 'Hazırlanıyor' : 
                      order.status === 'ready' ? 'Hazır' : 
                      order.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                  </span>
                  {isDelayed && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">
                      <AlertTriangle size={12} /> GECİKMELİ
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-[10px] md:text-[12px] font-bold text-brand-dark/20 tracking-widest uppercase">#{order.id?.slice(-4).toUpperCase()}</p>
                  {order.status === 'pending' && (
                    <p className={`text-[10px] font-bold tracking-widest uppercase ${isDelayed ? 'text-red-500' : 'text-brand-dark/40'}`}>
                      {Math.floor(diffMinutes)} dk önce
                    </p>
                  )}
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={item.image} className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-2xl shadow-sm" referrerPolicy="no-referrer" />
                          <span className="absolute -top-1 -right-1 bg-brand-dark text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-lg font-black shadow-md border-2 border-white">
                            {item.quantity}x
                          </span>
                        </div>
                        <span className="font-display font-black uppercase tracking-tight text-sm md:text-base leading-tight">{item.name}</span>
                      </div>
                      {order.freeItemId === item.id && (
                        <span className="bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter shadow-sm animate-pulse">BEDAVA</span>
                      )}
                    </div>
                  ))}
                </div>

                {order.discount && order.discount > 0 && (
                  <div className="bg-green-50 text-green-700 px-4 py-3 rounded-2xl flex items-center gap-2 mb-6 border border-green-100/50">
                    <Ticket size={14} className="stroke-[3]" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">İndirim Gelen Kupon</span>
                  </div>
                )}

                {order.notes && (
                  <div className="bg-orange-50 p-4 rounded-2xl mb-6 border border-orange-100">
                    <p className="text-[9px] uppercase font-black text-orange-800/40 mb-1 tracking-widest">Müşteri Notu</p>
                    <p className="text-xs font-medium text-orange-950/70">{order.notes}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => updateStatus(order.id!, 'preparing')}
                      className={`flex-1 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] group ${isDelayed ? 'bg-red-500 shadow-red-500/30 hover:bg-red-600' : 'bg-brand-primary shadow-brand-primary/30'}`}
                    >
                      BAŞLA <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button 
                      onClick={() => updateStatus(order.id!, 'ready')}
                      className="flex-1 bg-blue-500 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      HAZIR <CheckCircle2 size={18} />
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      onClick={() => updateStatus(order.id!, 'completed')}
                      className="flex-1 bg-green-500 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-green-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      TESLİM ET <Package size={18} />
                    </button>
                  )}
                  
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button 
                      onClick={() => setConfirmCancel(order.id!)}
                      className="bg-brand-muted/30 text-red-500 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm shrink-0 border border-brand-dark/5"
                      title="İptal Et"
                    >
                      <Ban size={24} />
                    </button>
                  )}
                </div>
              </motion.div>
            )})
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center"
            >
              <div className="bg-brand-muted w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-brand-dark/20">
                <Coffee size={40} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-dark/30">BU KATEGORİDE SİPARİŞ BULUNMUYOR</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-12 bg-brand-muted p-2 rounded-3xl w-fit mx-auto relative z-10 border border-brand-dark/5">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-3 bg-white rounded-2xl shadow-sm disabled:opacity-30 disabled:cursor-not-allowed text-brand-primary transition-all active:scale-95"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-2xl text-[10px] font-black transition-all ${
                  currentPage === i + 1 ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' : 'bg-white/50 hover:bg-white text-brand-dark/40'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-3 bg-white rounded-2xl shadow-sm disabled:opacity-30 disabled:cursor-not-allowed text-brand-primary transition-all active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {confirmCancel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-xl"
            onClick={() => setConfirmCancel(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Ban size={40} />
              </div>
              <h3 className="text-2xl font-display font-black uppercase tracking-tight mb-2">SİPARİŞİ İPTAL ET?</h3>
              <p className="text-brand-dark/40 text-[10px] uppercase font-bold tracking-[0.2em] mb-8 leading-relaxed">
                Bu siparişi iptal etmek istediğinden emin misin? Bu işlem geri alınamaz.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmCancel(null)}
                  className="py-4 bg-brand-muted text-brand-dark rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark/5 transition-all"
                >
                  VAZGEÇ
                </button>
                <button 
                  onClick={() => updateStatus(confirmCancel, 'cancelled')}
                  className="py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  EVET, İPTAL ET
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
