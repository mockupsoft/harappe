/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../App';
import {
  LogOut,
  Award,
  Clock,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Info,
  X,
  Heart,
  Coffee,
  Bean,
  User,
  Phone,
  MapPin,
  FileText,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { localDb } from '../lib/localDb';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuItem, Order } from '../types';
import { siteContact } from '../config/siteContact';
import { legalDocuments, type LegalDocument } from '../config/legalDocuments';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<MenuItem[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [legalOpen, setLegalOpen] = useState<LegalDocument | null>(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [draftPhone, setDraftPhone] = useState('');
  const [draftAddress, setDraftAddress] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const allOrders = await localDb.getOrders();
      const userOrders = allOrders
        .filter(o => o.customerId === user.uid)
        .reverse();
      setOrders(userOrders);

      const menu = await localDb.getMenu();
      const favItems = menu.filter(item => profile?.favorites?.includes(item.id));
      setFavorites(favItems);
    } catch (e) {
      console.error('Profil verisi yüklenemedi:', e);
    }
  }, [user, profile?.favorites]);

  useEffect(() => {
    void loadData();
    const handler = () => void loadData();
    window.addEventListener('orders_updated', handler);
    window.addEventListener('menu_updated', handler);
    window.addEventListener('profile_updated', handler);
    return () => {
      window.removeEventListener('orders_updated', handler);
      window.removeEventListener('menu_updated', handler);
      window.removeEventListener('profile_updated', handler);
    };
  }, [loadData]);

  useEffect(() => {
    if (!editingPersonal && profile) {
      setDraftPhone(profile.phone ?? '');
      setDraftAddress(profile.address ?? '');
    }
  }, [profile, editingPersonal]);

  const handleSavePersonal = async () => {
    if (!user || !profile) return;
    setSavingPersonal(true);
    try {
      await localDb.saveProfile({
        ...profile,
        phone: draftPhone.trim() || undefined,
        address: draftAddress.trim() || undefined,
      });
      window.dispatchEvent(new Event('profile_updated'));
      setEditingPersonal(false);
    } catch (e) {
      console.error('Profil kaydedilemedi:', e);
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('harappe_session');
    window.dispatchEvent(new Event('profile_updated'));
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream">
        <div className="coffee-card p-10 text-center max-w-sm">
          <div className="bg-brand-primary/10 p-6 rounded-[2.5rem] inline-block mb-6">
            <LogOut size={44} className="text-brand-primary" />
          </div>
          <h1 className="text-3xl mb-4 uppercase tracking-tighter">Opps!</h1>
          <p className="text-brand-dark/40 mb-8 font-display font-medium text-[10px] uppercase tracking-widest leading-loose">
            Lütfen siparişlerini takip etmek için giriş yap.
          </p>
          <Link to="/login" className="primary-btn inline-block">Giriş Yap</Link>
        </div>
      </div>
    );
  }

  const points = profile?.rewardPoints || 0;
  const rewardThreshold = 5;
  const hasReward = points >= rewardThreshold;
  const progress = points % rewardThreshold;
  const progressPercent = hasReward ? 100 : (progress / rewardThreshold) * 100;

  const totalOrders = orders.length;
  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, order) => acc + (order.total || 0), 0);

  return (
    <div className="p-4 sm:p-6 relative overflow-x-hidden min-h-screen pb-28">
      <div className="absolute top-1/2 -right-20 text-brand-primary/5 -rotate-12 pointer-events-none">
        <Coffee size={300} />
      </div>
      <div className="absolute top-40 -left-10 text-brand-primary/5 rotate-45 pointer-events-none">
        <Bean size={150} />
      </div>

      <header className="mb-8 sm:mb-10 relative z-10">
        <h1 className="text-3xl sm:text-4xl tracking-tighter uppercase truncate">{profile?.name}</h1>
        <p className="text-brand-dark/30 text-[8px] sm:text-[10px] uppercase font-black tracking-[0.2em] truncate">{profile?.email}</p>
      </header>

      {/* Kişisel bilgiler */}
      <section className="coffee-card p-5 sm:p-6 bg-white mb-8 relative z-10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-display font-black uppercase tracking-tight flex items-center gap-2">
            <User size={18} className="text-brand-primary" /> Kişisel bilgiler
          </h2>
          {!editingPersonal ? (
            <button
              type="button"
              onClick={() => setEditingPersonal(true)}
              className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline"
            >
              Düzenle
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingPersonal(false);
                  setDraftPhone(profile?.phone ?? '');
                  setDraftAddress(profile?.address ?? '');
                }}
                className="text-[10px] font-black uppercase tracking-widest text-brand-dark/40 hover:text-brand-dark"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={savingPersonal}
                onClick={() => void handleSavePersonal()}
                className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline disabled:opacity-50"
              >
                {savingPersonal ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-dark/30 mb-1">Ad soyad</p>
            <p className="text-sm font-bold text-brand-dark/80">{profile?.name || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-dark/30 mb-1">E-posta</p>
            <p className="text-sm font-bold text-brand-dark/80 truncate">{profile?.email || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-dark/30 mb-1 flex items-center gap-1">
              <Phone size={12} className="inline" /> Telefon
            </p>
            {editingPersonal ? (
              <input
                type="tel"
                value={draftPhone}
                onChange={e => setDraftPhone(e.target.value)}
                className="w-full rounded-xl border border-brand-dark/10 px-3 py-2.5 text-sm bg-brand-cream/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="05xx xxx xx xx"
                autoComplete="tel"
              />
            ) : (
              <p className="text-sm font-bold text-brand-dark/80">{profile?.phone?.trim() || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-dark/30 mb-1 flex items-center gap-1">
              <MapPin size={12} className="inline" /> Teslimat / adres
            </p>
            {editingPersonal ? (
              <textarea
                value={draftAddress}
                onChange={e => setDraftAddress(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-brand-dark/10 px-3 py-2.5 text-sm bg-brand-cream/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
                placeholder="Adres satırları"
                autoComplete="street-address"
              />
            ) : (
              <p className="text-sm font-bold text-brand-dark/80 whitespace-pre-wrap">{profile?.address?.trim() || '—'}</p>
            )}
          </div>
        </div>
      </section>

      {/* Sadakat Kartı */}
      <div className="p-10 bg-brand-primary text-white rounded-[40px] mb-10 relative overflow-hidden shadow-xl shadow-brand-primary/20">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Award size={20} className="text-white" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-[0.3em] text-white/90">Harappe Puan</span>
            </div>
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              <Info size={16} />
            </button>
          </div>

          <h2 className="text-3xl mb-6 font-display font-black tracking-tight uppercase text-white">
            {hasReward ? "Hediye kahveni alabilirsin!" : `Bedava kahveye ${rewardThreshold - progress} adım kaldı`}
          </h2>
          <div className="h-3 bg-brand-dark/20 rounded-full mb-3 p-1">
            <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between items-center text-[10px] text-white font-black uppercase tracking-widest">
            <span className="opacity-80">İlerleme: %{Math.round(progressPercent)}</span>
            <span className="opacity-80">{profile?.rewardPoints || 0} puan</span>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12 pointer-events-none">
          <Award size={240} />
        </div>
      </div>

      {/* Sipariş Özeti */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-10 relative z-10">
        <div className="coffee-card p-4 sm:p-6 bg-white flex flex-col items-center text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 text-brand-primary">
            <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
          </div>
          <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-brand-dark/30 mb-1">Toplam Sipariş</span>
          <span className="text-xl sm:text-2xl font-display font-black tracking-tighter">{totalOrders}</span>
        </div>
        <div className="coffee-card p-4 sm:p-6 bg-white flex flex-col items-center text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 text-green-600">
            <CreditCard size={20} className="sm:w-6 sm:h-6" />
          </div>
          <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-brand-dark/30 mb-1">Toplam Harcama</span>
          <span className="text-xl sm:text-2xl font-display font-black tracking-tighter text-green-600 truncate w-full">₺{totalSpent.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid gap-12">
        {favorites.length > 0 && (
          <section>
            <h3 className="text-xl mb-6 flex items-center gap-2 font-display font-black uppercase tracking-tight"><Heart size={18} className="text-red-500 fill-current" /> Favori Ürünlerim</h3>
            <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
              {favorites.map(item => (
                <Link key={item.id} to="/menu" className="coffee-card p-4 min-w-[200px] flex flex-col gap-3 group bg-white shadow-sm hover:border-red-500/20 transition-all">
                  <div className="relative">
                    <img src={item.image} className="w-full h-32 object-cover rounded-2xl" referrerPolicy="no-referrer" alt="" />
                    <div className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-500 backdrop-blur-sm shadow-sm">
                      <Heart size={12} className="fill-current" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-display font-black uppercase tracking-tight truncate">{item.name}</h4>
                    <p className="text-[10px] text-brand-dark/40 font-bold tracking-widest">₺{(item.price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="relative z-10">
          <h3 className="text-xl mb-6 flex items-center gap-2 font-display font-black uppercase tracking-tight"><Clock size={18} className="text-brand-primary" /> Geçmiş Siparişler</h3>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-center py-10 text-brand-dark/20 font-display font-medium uppercase tracking-widest text-[10px]">Henüz siparişin yok.</p>
            ) : (
              orders.map(order => (
                <Link key={order.id} to={`/order-status/${order.id}`} className="coffee-card p-3 sm:p-5 flex justify-between items-center gap-3 bg-white group hover:border-brand-primary/20 transition-all min-w-0">
                  <div className="flex gap-3 sm:gap-4 items-start min-w-0 flex-1">
                    <div className="bg-brand-muted w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center group-hover:bg-brand-primary/5 transition-colors shrink-0 py-1">
                      <span className="text-[7px] sm:text-[8px] font-black uppercase text-brand-dark/25 group-hover:text-brand-primary/50 leading-none text-center px-0.5">Masa</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm sm:text-base font-black uppercase tracking-tight text-brand-dark/85 group-hover:text-brand-primary break-words [overflow-wrap:anywhere] line-clamp-2 leading-snug">
                        {order.tableNum}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-brand-dark/30 truncate max-w-[min(100%,9rem)]">#{order.id?.slice(-6).toUpperCase()}</p>
                        <span className={`text-[7px] sm:text-[8px] uppercase px-1.5 py-0.5 rounded-full font-black tracking-[0.1em] whitespace-nowrap shrink-0 ${
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {order.status === 'pending' ? 'Beklemede' :
                           order.status === 'preparing' ? 'Hazırlanıyor' :
                           order.status === 'ready' ? 'Hazır' :
                           order.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-brand-dark/80 mt-0.5 truncate">
                        {new Date(order.createdAt?.seconds * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} • {new Date(order.createdAt?.seconds * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 ml-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-brand-dark/20 block mb-0.5 whitespace-nowrap">Tutar</span>
                      <span className="text-sm sm:text-lg font-display font-black tracking-tighter text-brand-dark/90">₺{(order.total || 0).toFixed(2)}</span>
                    </div>
                    <div className="p-1.5 sm:p-2 rounded-xl bg-brand-muted group-hover:bg-brand-primary group-hover:text-white transition-all">
                      <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="relative z-10">
          <h3 className="text-xl mb-4 flex items-center gap-2 font-display font-black uppercase tracking-tight">
            <FileText size={18} className="text-brand-primary" /> Sözleşmeler
          </h3>
          <div className="coffee-card bg-white divide-y divide-brand-dark/5 overflow-hidden">
            {legalDocuments.map(doc => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setLegalOpen(doc)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-brand-cream/40 transition-colors"
              >
                <span className="text-sm font-bold text-brand-dark/90">{doc.title}</span>
                <ChevronRight size={18} className="text-brand-dark/25 shrink-0" />
              </button>
            ))}
          </div>
        </section>

        <section className="relative z-10">
          <h3 className="text-xl mb-4 flex items-center gap-2 font-display font-black uppercase tracking-tight">
            <Phone size={18} className="text-brand-primary" /> İletişim
          </h3>
          <div className="coffee-card p-5 sm:p-6 bg-white space-y-4">
            <p className="font-display font-black text-brand-dark">{siteContact.businessName}</p>
            <a href={`tel:${siteContact.phoneTel}`} className="flex items-center gap-3 text-sm font-bold text-brand-primary hover:underline">
              <Phone size={18} className="shrink-0 opacity-70" />
              {siteContact.phoneDisplay}
            </a>
            <a href={`mailto:${siteContact.email}`} className="flex items-center gap-3 text-sm font-bold text-brand-dark/80 hover:text-brand-primary">
              <Mail size={18} className="shrink-0 text-brand-primary/70" />
              {siteContact.email}
            </a>
            <div className="flex gap-3 text-sm text-brand-dark/70">
              <MapPin size={18} className="shrink-0 text-brand-primary/70 mt-0.5" />
              <div>
                {siteContact.addressLines.map(line => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-dark/40">{siteContact.hours}</p>
            {siteContact.mapsUrl ? (
              <a
                href={siteContact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-primary"
              >
                Haritada aç <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-10 relative z-10">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-brand-dark/10 bg-white text-brand-dark font-black uppercase tracking-widest text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut size={18} />
          Çıkış yap
        </button>
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
                <h4 className="font-display font-black uppercase tracking-tight text-xl">Puan Sistemi Nedir?</h4>
                <button type="button" onClick={() => setShowInfo(false)} className="text-brand-dark/20 hover:text-brand-primary p-1"><X size={20} /></button>
              </div>
              <ul className="space-y-4 text-xs font-bold uppercase tracking-tight text-brand-dark/60">
                <li className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-primary mt-1 shrink-0" />
                  <span>Her siparişte 1 puan kazanırsın.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-primary mt-1 shrink-0" />
                  <span>5 puan topladığında bir &quot;Hediye Kahve&quot; hakkın olur.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-primary mt-1 shrink-0" />
                  <span>Puanlarını kullandığında sepetteki en pahalı ürün ücretsiz olur!</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="w-full mt-8 py-4 bg-brand-muted rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all"
              >
                ANLADIM
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {legalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-brand-dark/95 backdrop-blur-xl"
            onClick={() => setLegalOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl text-brand-dark max-w-md w-full max-h-[85vh] flex flex-col relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-3 mb-4 shrink-0">
                <h4 className="font-display font-black uppercase tracking-tight text-lg leading-tight">{legalOpen.title}</h4>
                <button type="button" onClick={() => setLegalOpen(null)} className="text-brand-dark/20 hover:text-brand-primary p-1 shrink-0"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto pr-1 space-y-4 text-sm text-brand-dark/75 leading-relaxed">
                {legalOpen.body.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLegalOpen(null)}
                className="w-full mt-6 py-4 bg-brand-muted rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all shrink-0"
              >
                Kapat
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
