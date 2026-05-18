import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Order } from '../types';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Coffee, Package, ChevronLeft, Bean } from 'lucide-react';
import LoadingView from '../components/LoadingView';
import { localDb } from '../lib/localDb';

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const all = await localDb.getOrders();
      const found = all.find(o => o.id === orderId);
      if (found) setOrder(found);
    } catch (e) {
      console.error('Sipariş yüklenemedi:', e);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
    const handler = () => void loadOrder();
    window.addEventListener('orders_updated', handler);
    return () => window.removeEventListener('orders_updated', handler);
  }, [loadOrder]);

  if (!order) return <LoadingView fullScreen message="Siparişini arıyoruz..." />;

  const steps = [
    { id: 'pending', label: 'Sipariş Alındı', icon: Clock },
    { id: 'preparing', label: 'Hazırlanıyor', icon: Coffee },
    { id: 'ready', label: 'Masanıza Hazır', icon: Package },
    { id: 'completed', label: 'Afiyet Olsun!', icon: CheckCircle2 }
  ];

  const currentIdx = steps.findIndex(s => s.id === order.status);
  const CurrentStepIcon = steps[currentIdx]?.icon;

  return (
    <div className="p-6 max-w-md mx-auto relative overflow-x-hidden min-h-screen">
      {/* Decorative Icons */}
      <div className="absolute -top-20 -right-20 text-brand-primary/5 -rotate-12 pointer-events-none">
        <Coffee size={300} />
      </div>
      <div className="absolute top-1/2 -left-20 text-brand-primary/5 rotate-12 pointer-events-none">
        <Bean size={150} />
      </div>

      <header className="mb-8 flex items-center gap-4 relative z-10">
        <Link to="/" className="p-2 bg-white rounded-full shadow-sm">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-3xl">Hazırlanıyor!</h1>
      </header>

      <div className="coffee-card p-8 text-center mb-8">
        <div className="mb-6 relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 rounded-[2.5rem] border-4 border-brand-primary/10" />
          <motion.div 
            className="absolute inset-0 rounded-[2.5rem] border-4 border-brand-primary border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {CurrentStepIcon && <CurrentStepIcon size={48} className="text-brand-primary" />}
          </div>
        </div>

        <h2 className="text-3xl mb-2 capitalize tracking-tighter">
          {order.status === 'pending' ? 'Beklemede' : 
           order.status === 'preparing' ? 'Hazırlanıyor' : 
           order.status === 'ready' ? 'Hazır' : 
           order.status === 'completed' ? 'Tamamlandı' : 'İptal Edildi'}
        </h2>
        <p className="text-brand-dark/30 text-[10px] uppercase font-black tracking-widest">Sipariş No: #{order.id?.slice(-6).toUpperCase()}</p>
        <p className="mt-4 px-2 font-display font-black text-brand-primary uppercase tracking-widest text-[10px] max-w-full break-words [overflow-wrap:anywhere] line-clamp-3 leading-relaxed">
          Masa {order.tableNum}
        </p>
      </div>

      <div className="space-y-6 relative">
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-brand-primary/10" />
        
        {steps.map((step, idx) => {
          const isActive = idx <= currentIdx;
          const StepIcon = step.icon;
          
          return (
            <div key={step.id} className="flex gap-6 items-center relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                isActive ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-110' : 'bg-white border-brand-primary/10 text-brand-primary/20'
              }`}>
                <StepIcon size={20} />
              </div>
              <div>
                <p className={`font-display font-black text-xs uppercase tracking-widest ${isActive ? 'text-brand-dark' : 'text-brand-dark/20'}`}>
                  {step.label}
                </p>
                {isActive && idx === currentIdx && (
                  <p className="text-[10px] uppercase tracking-widest text-brand-primary font-black mt-1">İşlemde</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 coffee-card p-6">
        <h3 className="text-lg mb-4 text-brand-dark font-display font-black uppercase tracking-tight">Özet</h3>
        <div className="space-y-4 mb-6">
          {order.items.map(item => (
            <div key={item.id} className="flex gap-4 items-center">
              <img 
                src={item.image} 
                className="w-12 h-12 object-cover rounded-xl shrink-0" 
                referrerPolicy="no-referrer" 
                alt={item.name}
              />
              <div className="flex-1 flex justify-between">
                <span className="text-brand-dark/70 font-medium text-xs">{item.quantity}x {item.name}</span>
                <span className="font-bold text-sm">₺{((item.price || 0) * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div className="pt-4 border-t border-brand-dark/5 mt-4 flex justify-between font-display font-black text-xl uppercase tracking-tighter">
            <span>Toplam</span>
            <span>₺{(order.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {order.notes && (
          <div className="bg-brand-muted p-4 rounded-2xl border border-brand-dark/5">
            <p className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 mb-2">Sipariş Notu</p>
            <p className="text-sm italic text-brand-dark/70 leading-relaxed">"{order.notes}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
