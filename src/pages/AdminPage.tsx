import { useEffect, useState, FormEvent, useRef, useCallback, useMemo } from 'react';
import { MenuItem, Order, PriceLog, Table } from '../types';
import { useAuth } from '../App';
import { Plus, Trash2, X, DollarSign, Package, QrCode, CheckCircle2, RefreshCw, ChevronRight, Zap, TrendingUp, BarChart3, PieChart as PieChartIcon, Percent, ArrowUpRight, ArrowDownRight, Ticket, History, User, Edit3, Image as ImageIcon, Upload, Settings, Layers, Pencil } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { localDb } from '../lib/localDb';

import { getPlaceholderImage } from '../lib/imageUtils';
import LoadingView from '../components/LoadingView';
import { seedMenu } from '../lib/seedMenu';

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<PriceLog[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'qr' | 'stats' | 'logs' | 'tables'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [ordersDataReady, setOrdersDataReady] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: 'Genel', image: '' });
  const [newTable, setNewTable] = useState({ name: '', image: '' });
  const [showAddTable, setShowAddTable] = useState(false);
  const [tableGen, setTableGen] = useState('Berlin');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkType, setBulkType] = useState<'percent' | 'fixed'>('percent');
  const [bulkAction, setBulkAction] = useState<'increase' | 'decrease'>('increase');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renameDraft, setRenameDraft] = useState<{ old: string; value: string } | null>(null);
  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{ name: string; moveTo: string } | null>(null);
  const prevOrdersCount = useRef<number>(0);
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pagination for orders
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  const playNotification = useCallback(() => {
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
  }, []);

  const loadData = useCallback(async () => {
    try {
      const freshMenu = await localDb.getMenu();
      const freshOrders = await localDb.getOrders();
      const freshLogs = await localDb.getLogs();
      const freshTables = await localDb.getTables();

      setItems(freshMenu);
      setLogs(freshLogs);
      setTables(freshTables);

      if (!isInitialLoad.current && freshOrders.length > prevOrdersCount.current) {
        if (soundEnabled) {
          playNotification();
        }
      }

      setOrders(freshOrders);
      prevOrdersCount.current = freshOrders.length;
      isInitialLoad.current = false;
    } catch (e) {
      console.error('Admin veri yüklenemedi:', e);
    } finally {
      setOrdersDataReady(true);
    }
  }, [soundEnabled, playNotification]);

  const toggleSound = () => {
    if (!soundEnabled) {
      // Browser requirements for audio
      const dummyAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      dummyAudio.volume = 0;
      dummyAudio.play().then(() => {
        setSoundEnabled(true);
        playNotification(); // Play a test sound
      }).catch(e => {
        alert('Tarayıcınız ses çalmaya izin vermiyor. Lütfen adres çubuğundaki kilit simgesine tıklayıp ses izinlerini kontrol edin.');
      });
    } else {
      setSoundEnabled(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = () => void loadData();
    window.addEventListener('menu_updated', handler);
    window.addEventListener('orders_updated', handler);
    window.addEventListener('logs_updated', handler);
    window.addEventListener('tables_updated', handler);
    return () => {
      window.removeEventListener('menu_updated', handler);
      window.removeEventListener('orders_updated', handler);
      window.removeEventListener('logs_updated', handler);
      window.removeEventListener('tables_updated', handler);
    };
  }, [loadData]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => {
      const c = i.category?.trim();
      if (c) s.add(c);
    });
    extraCategories.forEach(c => {
      const t = c.trim();
      if (t) s.add(t);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [items, extraCategories]);

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categoryOptions.includes(name)) {
      alert('Bu kategori zaten var.');
      return;
    }
    setExtraCategories(prev => [...prev, name]);
    setNewCategoryName('');
    setNewItem(prev => ({ ...prev, category: name }));
  };

  const handleSaveRenameCategory = async () => {
    if (!renameDraft) return;
    const oldName = renameDraft.old;
    const newName = renameDraft.value.trim();
    if (!newName) return;
    if (newName !== oldName && categoryOptions.includes(newName)) {
      alert('Bu isimde bir kategori zaten var.');
      return;
    }
    const m = items.map(i => (i.category === oldName ? { ...i, category: newName } : i));
    await localDb.saveMenu(m);
    setItems(m);
    setExtraCategories(prev =>
      prev.map(c => (c === oldName ? newName : c)).filter((c, i, arr) => arr.indexOf(c) === i)
    );
    setRenameDraft(null);
    setNewItem(prev => (prev.category === oldName ? { ...prev, category: newName } : prev));
    if (editingItem?.category === oldName) setEditingItem({ ...editingItem, category: newName });
  };

  const openDeleteCategory = (name: string) => {
    const count = items.filter(i => i.category === name).length;
    const others = categoryOptions.filter(c => c !== name);
    if (count === 0) {
      setExtraCategories(prev => prev.filter(c => c !== name));
      return;
    }
    if (others.length === 0) {
      alert('Taşıyabileceğiniz başka kategori yok. Önce yeni bir kategori oluşturun.');
      return;
    }
    setDeleteCategoryModal({ name, moveTo: others[0] });
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryModal) return;
    const { name, moveTo } = deleteCategoryModal;
    const m = items.map(i => (i.category === name ? { ...i, category: moveTo } : i));
    await localDb.saveMenu(m);
    setItems(m);
    setExtraCategories(prev => prev.filter(c => c !== name));
    setDeleteCategoryModal(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Resim boyutu 2MB\'dan küçük olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEdit && editingItem) {
        setEditingItem({ ...editingItem, image: base64String });
      } else if (isEdit && editingTable) {
        setEditingTable({ ...editingTable, image: base64String });
      } else if (activeTab === 'tables') {
        setNewTable({ ...newTable, image: base64String });
      } else {
        setNewItem({ ...newItem, image: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    const finalImage = newItem.image || getPlaceholderImage(newItem.name, newItem.category);
    const m = await localDb.getMenu();
    m.push({ 
      id: 'item_' + Date.now(), 
      ...newItem, 
      price: parseFloat(newItem.price as string), 
      image: finalImage, 
      active: true 
    } as MenuItem);
    await localDb.saveMenu(m);
    setShowAdd(false);
    const nextCat = categoryOptions[0] ?? 'Genel';
    setNewItem({ name: '', description: '', price: '', category: nextCat, image: '' });
  };

  const handleEditItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const m = items.map(i => i.id === editingItem.id ? { 
      ...editingItem, 
      price: parseFloat(editingItem.price as unknown as string) 
    } : i);

    // If price changed, log it
    const oldItem = items.find(i => i.id === editingItem.id);
    if (oldItem && oldItem.price !== editingItem.price) {
      await localDb.addLog({
        itemId: editingItem.id,
        itemName: editingItem.name,
        oldPrice: oldItem.price,
        newPrice: Number(editingItem.price),
        changedBy: profile?.email || 'admin@harappe.com',
        type: 'individual'
      });
    }

    await localDb.saveMenu(m);
    setEditingItem(null);
  };

  const handleBulkUpdate = async () => {
    const amount = parseFloat(bulkAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Lütfen geçerli bir tutar girin.');
      return;
    }

    const typeStr = bulkType === 'percent' ? `%${amount}` : `${amount}₺`;
    if (!confirm(`Tüm ürünlerin fiyatlarını ${typeStr} ${bulkAction === 'increase' ? 'artırmak' : 'azaltmak'} istediğine emin misin?`)) {
      return;
    }

    const currentMenu = await localDb.getMenu();
    const m = currentMenu.map(item => {
      const currentPrice = Number(item.price) || 0;
      let newPrice = currentPrice;
      
      if (bulkType === 'percent') {
        const diff = (currentPrice * amount) / 100;
        newPrice = bulkAction === 'increase' ? currentPrice + diff : currentPrice - diff;
      } else {
        newPrice = bulkAction === 'increase' ? currentPrice + amount : currentPrice - amount;
      }
      
      const finalPrice = Math.max(0, parseFloat(newPrice.toFixed(2)));
      return { ...item, price: finalPrice };
    });

    console.log('Bulk updating prices:', m.slice(0, 3));
    
    await localDb.saveMenu(m);
    setItems(m); // Direct state update for UI
    
    // Log the bulk update AFTER saving
    await localDb.addLog({
      itemId: 'multiple',
      itemName: `Toplu Fiyat Güncelleme (${bulkAction === 'increase' ? 'Zam' : 'İndirim'} - ${bulkType === 'percent' ? '%' + amount : amount + '₺'})`,
      oldPrice: 0,
      newPrice: 0,
      changedBy: profile?.email || 'admin@harappe.com',
      type: 'bulk'
    });

    setShowBulk(false);
    setBulkAmount('');
    alert('Tüm fiyatlar başarıyla güncellendi.');
  };

  const toggleActive = async (id: string, active: boolean) => {
    const m = items.map(i => i.id === id ? { ...i, active: !active } : i);
    setItems(m);
    await localDb.saveMenu(m);
  };

  const deleteItem = async (id: string) => {
    if (confirm('Bu ürünü silmek istediğine emin misin?')) {
      const m = items.filter(i => i.id !== id);
      setItems(m);
      await localDb.saveMenu(m);
    }
  };

  const updateTable = async (table: Table) => {
    const currentTables = await localDb.getTables();
    const updated = currentTables.map(t => t.id === table.id ? table : t);
    await localDb.saveTables(updated);
    setEditingTable(null);
  };

  const toggleTableActive = async (id: string) => {
    const fresh = await localDb.getTables();
    const updated = fresh.map(t => t.id === id ? { ...t, active: !t.active } : t);
    await localDb.saveTables(updated);
  };

  const handleAddTable = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTable.name) return;
    const currentTables = await localDb.getTables();
    const table: Table = {
      id: 'table_' + Date.now(),
      name: newTable.name,
      active: true,
      image: newTable.image
    };
    await localDb.saveTables([...currentTables, table]);
    setNewTable({ name: '', image: '' });
    setShowAddTable(false);
  };

  const deleteTable = async (id: string) => {
    if (confirm('Bu masayı silmek istediğine emin misin?')) {
      const fresh = await localDb.getTables();
      const updated = fresh.filter(t => t.id !== id);
      await localDb.saveTables(updated);
    }
  };

  const updateItemPrice = async (item: MenuItem) => {
    const newPriceStr = prompt(`${item.name} için yeni fiyatı giriniz:`, item.price.toString());
    if (newPriceStr === null) return;
    
    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      alert('Geçersiz fiyat!');
      return;
    }

    const currentMenu = await localDb.getMenu();
    const m = currentMenu.map(i => i.id === item.id ? { ...i, price: newPrice } : i);
    
    await localDb.saveMenu(m);
    setItems(m);

    // Log the update AFTER saving
    await localDb.addLog({
      itemId: item.id,
      itemName: item.name,
      oldPrice: item.price,
      newPrice: newPrice,
      changedBy: profile?.email || 'admin@harappe.com',
      type: 'individual'
    });
  };

  // Analytics
  const totalRev = orders.reduce((a, b) => a + (b.status === 'completed' ? b.total : 0), 0);
  const totalDiscounts = orders.reduce((a, b) => a + (b.discount || 0), 0);
  const totalCoupons = orders.filter(o => o.discount && o.discount > 0).length;
  
  const chartData = orders.reduce((acc: any[], order) => {
    if (!order.createdAt) return acc;
    const date = new Date(order.createdAt?.seconds * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    const existing = acc.find(a => a.date === date);
    if (existing) existing.total += order.total;
    else acc.push({ date, total: order.total });
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  const categoryStats = orders.reduce((acc: {[key: string]: number}, order) => {
    order.items.forEach(item => {
      acc[item.category] = (acc[item.category] || 0) + item.quantity;
    });
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#D97706', '#059669', '#2563EB', '#7C3AED', '#DB2777', '#4B5563'];

  if (authLoading) return <LoadingView fullScreen message="Yönetici paneline bağlanılıyor..." />;

  return (
    <div className="p-4 md:p-6 pb-32 max-w-6xl mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 mt-4 md:mt-0">
        <div className="text-center sm:text-left shrink-0">
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary mb-1 block">YÖNETİM PANELİ</span>
          <h1 className="text-3xl md:text-5xl tracking-tighter leading-none">KONTROL MERKEZİ</h1>
        </div>
        
        {/* Tab Navigation — mobilde taşan sekmeler yatay kaydırılır (flex min-w-0 şart) */}
        <div className="w-full min-w-0 sm:flex-1">
          <div
            role="tablist"
            className="flex flex-nowrap bg-brand-muted p-1.5 rounded-full shadow-sm overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] items-center gap-0 max-w-full no-scrollbar"
          >
          <button 
            onClick={toggleSound}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap mr-2 ${
              soundEnabled ? 'bg-green-500 text-white shadow-sm' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }`}
            title={soundEnabled ? 'Sesi Kapa' : 'Sesi Aç (Tarayıcı İzni İçin)'}
          >
            {soundEnabled ? <Zap size={14} className="animate-pulse" /> : <X size={14} />}
            <span>SES {soundEnabled ? 'AÇIK' : 'KAPALI'}</span>
          </button>
          
          <div className="h-6 w-px bg-brand-dark/10 mx-2" />

          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            <Package size={14} className="shrink-0" /> <span>SİPARİŞLER</span>
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'menu' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            <Plus size={14} className="shrink-0" /> <span>MENÜ</span>
          </button>
          <button 
            onClick={() => setActiveTab('qr')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'qr' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            <QrCode size={14} className="shrink-0" /> <span>MASA QR</span>
          </button>
          <button 
            onClick={() => setActiveTab('tables')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'tables' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            <Settings size={14} className="shrink-0" /> <span>MASALAR</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            <TrendingUp size={14} className="shrink-0" /> <span>RAPORLAR</span>
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'logs' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            <History size={14} className="shrink-0" /> <span>LOGLAR</span>
          </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 px-2 md:px-0">
        {/* Kazanç */}
        <div className="bg-brand-primary text-white rounded-[3rem] md:rounded-full p-6 md:p-8 shadow-xl shadow-brand-primary/20 flex flex-col items-center justify-center relative overflow-hidden group min-h-[140px] md:min-h-[160px]">
          <DollarSign size={24} className="absolute top-6 left-8 opacity-30 group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-base md:text-xl font-black opacity-80">₺</span>
              <span className="text-2xl md:text-4xl font-display font-black tracking-tighter leading-none">
                {(totalRev || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.3em] opacity-60">Kazanç</p>
          </div>
        </div>

        {/* Sipariş */}
        <div className="bg-white text-brand-dark rounded-[3rem] md:rounded-full p-6 md:p-8 shadow-xl shadow-brand-dark/5 flex flex-col items-center justify-center relative overflow-hidden group min-h-[140px] md:min-h-[160px] border border-brand-dark/5">
          <Package size={24} className="absolute top-6 left-8 text-brand-primary opacity-80 group-hover:rotate-12 transition-transform" />
          <div className="text-center">
            <div className="text-2xl md:text-4xl font-display font-black tracking-tighter leading-none mb-1">
              {orders.length}
            </div>
            <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.3em] text-brand-dark/30">Sipariş</p>
          </div>
        </div>

        {/* Kupon */}
        <div className="bg-white text-brand-dark rounded-[3rem] md:rounded-full p-6 md:p-8 shadow-xl shadow-brand-dark/5 flex flex-col items-center justify-center relative overflow-hidden group min-h-[140px] md:min-h-[160px] border border-brand-dark/5">
          <Ticket size={24} className="absolute top-6 left-8 text-brand-primary opacity-30 group-hover:-rotate-12 transition-transform" />
          <div className="text-center">
            <div className="text-2xl md:text-4xl font-display font-black tracking-tighter leading-none mb-1">
              {totalCoupons}
            </div>
            <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.3em] text-brand-dark/30">Kupon</p>
          </div>
        </div>

        {/* İndirim */}
        <div className="bg-green-500 text-white rounded-[3rem] md:rounded-full p-6 md:p-8 shadow-xl shadow-green-500/20 flex flex-col items-center justify-center relative overflow-hidden group min-h-[140px] md:min-h-[160px]">
          <DollarSign size={24} className="absolute top-6 left-8 opacity-30 group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-base md:text-xl font-black opacity-80">₺</span>
              <span className="text-2xl md:text-4xl font-display font-black tracking-tighter leading-none">
                {totalDiscounts.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.3em] opacity-60">İndirim</p>
          </div>
        </div>
      </div>

      {/* Conditional Content Rendering */}
      <AnimatePresence mode="wait">
        {activeTab === 'orders' && (
          <motion.div
            key="orders-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6 md:space-y-8"
          >
            <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 min-w-0">
                <h2 className="text-xl md:text-2xl font-display font-black tracking-tight uppercase text-brand-dark/80 px-2 md:px-0 shrink-0">Sipariş Yönetimi</h2>
                <div className="flex flex-wrap items-center gap-2 px-2 md:px-0 min-w-0 md:flex-1 md:justify-end">
                  <div className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar pb-2 md:pb-0 w-full max-w-full min-w-0 md:w-auto bg-brand-muted p-1 md:p-1.5 rounded-full">
                    {[
                      { id: 'all', label: 'Hepsi' },
                      { id: 'pending', label: 'Bekleyen' },
                      { id: 'preparing', label: 'Hazırlanan' },
                      { id: 'ready', label: 'Hazır' },
                      { id: 'completed', label: 'Biten' },
                      { id: 'cancelled', label: 'İptal' }
                    ].map(f => (
                      <button 
                        key={f.id}
                        onClick={() => {
                          setStatusFilter(f.id);
                          setCurrentPage(1); // Reset to first page on filter change
                        }}
                        className={`px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                          statusFilter === f.id ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-dark/40 hover:text-brand-dark/60'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="h-6 w-px bg-brand-dark/5 mx-2 hidden md:block" />
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-muted text-brand-dark/60 text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/5 transition-all"
                  >
                    <RefreshCw size={12} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
                    {sortOrder === 'desc' ? 'En Yeni' : 'En Eski'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {(() => {
                  const filteredOrders = orders
                    .filter(o => statusFilter === 'all' || o.status === statusFilter)
                    .sort((a, b) => {
                      const tA = a.createdAt?.seconds || 0;
                      const tB = b.createdAt?.seconds || 0;
                      return sortOrder === 'desc' ? tB - tA : tA - tB;
                    });
                  
                  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
                  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

                  if (!ordersDataReady) {
                    return (
                      <div className="text-center py-20 bg-brand-muted/30 rounded-[3rem] border-2 border-dashed border-brand-dark/5">
                        <RefreshCw size={40} className="mx-auto mb-4 text-brand-primary/40 animate-spin" />
                        <p className="text-[10px] uppercase font-black tracking-widest text-brand-dark/40">Siparişler yükleniyor...</p>
                      </div>
                    );
                  }

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="text-center py-20 bg-brand-muted/30 rounded-[3rem] border-2 border-dashed border-brand-dark/5">
                        <Package size={48} className="mx-auto mb-4 text-brand-dark/10" />
                        <p className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30">Bu kategoride sipariş bulunamadı</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {paginatedOrders.map(order => (
                        <div key={order.id} className="coffee-card p-4 md:p-6 flex flex-col md:flex-row justify-between gap-6 !bg-white/50 backdrop-blur-md border border-brand-primary/10">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-start md:items-center justify-between md:justify-start gap-3 mb-4 md:mb-2 min-w-0">
                              <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
                                <span className="font-display font-black uppercase tracking-tight text-lg md:text-xl min-w-0 break-words [overflow-wrap:anywhere] line-clamp-2 leading-snug">
                                  {order.tableNum}
                                </span>
                                <span className="text-[10px] uppercase bg-brand-muted px-2 py-1 rounded-lg font-black tracking-widest text-brand-dark/40 shrink-0">#{order.id?.slice(-6).toUpperCase()}</span>
                              </div>
                              <span className={`md:hidden text-[10px] uppercase px-3 py-1.5 rounded-xl font-black tracking-widest shadow-sm ${
                                order.status === 'completed' ? 'bg-green-500 text-white shadow-green-500/20' : 
                                order.status === 'cancelled' ? 'bg-red-500 text-white shadow-red-500/20' : 
                                order.status === 'ready' ? 'bg-blue-500 text-white shadow-blue-500/20' :
                                order.status === 'preparing' ? 'bg-cyan-500 text-white shadow-cyan-500/20' : 
                                'bg-brand-primary text-white shadow-brand-primary/20'
                              }`}>
                                {order.status === 'pending' ? 'Beklemede' : 
                                 order.status === 'preparing' ? 'Hazırlanıyor' : 
                                 order.status === 'ready' ? 'Hazır' : 
                                 order.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary text-[10px] font-black uppercase">
                                {order.customerName?.charAt(0)}
                              </div>
                              <p className="text-sm font-bold text-brand-dark/80 uppercase tracking-wide">{order.customerName}</p>
                            </div>

                            <div className="space-y-3 mb-4 bg-brand-cream/50 p-4 rounded-2xl">
                              {order.items.map((i, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <img src={i.image} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold uppercase tracking-tight text-brand-dark/60">{i.quantity}x {i.name}</span>
                                      {order.freeItemId === i.id && (
                                        <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter">İkram Ürün (Puan Kullanımı)</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-brand-dark/60">₺{((i.price || 0) * i.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            {order.notes && (
                              <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100/50 italic text-[11px] text-orange-900">
                                <span className="font-black uppercase not-italic mr-2 text-orange-800 tracking-widest text-[9px]">MİSAFİR NOTU:</span>
                                "{order.notes}"
                              </div>
                            )}
                          </div>

                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:min-w-[160px] pt-4 md:pt-0 border-t md:border-t-0 border-brand-dark/5">
                            <div className="text-right">
                              <span className="text-brand-dark/30 text-[10px] font-black uppercase tracking-[0.2em] block mb-1">Toplam Tutar</span>
                              <div className="flex flex-col items-end">
                                <div className="flex items-baseline gap-2">
                                  {Boolean(order.discount && order.discount > 0) && (
                                    <span className="text-[10px] font-black text-green-600/50 line-through">₺{((order.total || 0) + order.discount).toFixed(2)}</span>
                                  )}
                                  <span className="text-xl md:text-2xl font-display font-black tracking-tighter leading-none">₺{(order.total || 0).toFixed(2)}</span>
                                </div>
                                {Boolean(order.discount && order.discount > 0) && (
                                  <div className="flex items-center gap-1 mt-2 px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100 shadow-sm shrink-0">
                                    <Zap size={8} className="fill-green-600" />
                                    <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                      -₺{order.discount.toFixed(2)} İNDİRİM
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <span className={`hidden md:block text-[10px] uppercase px-3 py-1.5 rounded-xl font-black tracking-widest shadow-sm ${
                              order.status === 'completed' ? 'bg-green-500 text-white shadow-green-500/20' : 
                              order.status === 'cancelled' ? 'bg-red-500 text-white shadow-red-500/20' : 
                              order.status === 'ready' ? 'bg-blue-500 text-white shadow-blue-500/20' :
                              order.status === 'preparing' ? 'bg-cyan-500 text-white shadow-cyan-500/20' : 
                              'bg-brand-primary text-white shadow-brand-primary/20'
                            }`}>
                              {order.status === 'pending' ? 'Beklemede' : 
                               order.status === 'preparing' ? 'Hazırlanıyor' : 
                               order.status === 'ready' ? 'Hazır' : 
                               order.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 bg-brand-muted p-2 rounded-2xl w-fit mx-auto">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="p-2 bg-white rounded-xl shadow-sm disabled:opacity-30 disabled:cursor-not-allowed text-brand-primary transition-all active:scale-95"
                          >
                            <ChevronRight className="rotate-180" size={18} />
                          </button>
                          <div className="flex gap-2">
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                                  currentPage === i + 1 ? 'bg-brand-primary text-white' : 'hover:bg-white text-brand-dark/40'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="p-2 bg-white rounded-xl shadow-sm disabled:opacity-30 disabled:cursor-not-allowed text-brand-primary transition-all active:scale-95"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'menu' && (
          <motion.div
            key="menu-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-8"
          >
            <section className="coffee-card p-4 md:p-8 bg-white border border-brand-primary/5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <h2 className="text-xl md:text-2xl flex items-center gap-2 font-display font-black tracking-tight uppercase"><Plus size={20} className="text-brand-primary" /> Menü Yönetimi</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowBulk(!showBulk)} 
                    className={`p-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest ${showBulk ? 'bg-brand-dark text-white' : 'bg-brand-muted text-brand-dark/40 hover:bg-brand-primary/5'}`}
                  >
                    <RefreshCw size={16} className={showBulk ? 'rotate-180' : ''} /> <span>TOPLU FİYAT</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowAdd(true);
                      setNewItem(prev => ({
                        ...prev,
                        category: categoryOptions.includes(prev.category)
                          ? prev.category
                          : (categoryOptions[0] ?? 'Genel'),
                      }));
                    }} 
                    className="bg-brand-primary text-white p-4 rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest"
                  >
                    <Plus size={16} /> <span>YENİ ÜRÜN</span>
                  </button>
                </div>
              </div>

              <div className="coffee-card p-4 md:p-6 bg-brand-muted/50 border border-brand-dark/10 rounded-[2rem] mb-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
                  <h3 className="text-lg md:text-xl font-display font-black tracking-tight uppercase flex items-center gap-2">
                    <Layers size={20} className="text-brand-primary shrink-0" /> Kategori yönetimi
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:max-w-md">
                    <input
                      type="text"
                      placeholder="Yeni kategori adı"
                      className="flex-1 bg-white p-3 md:p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 outline-none font-bold text-sm"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="py-3 md:py-4 px-6 rounded-2xl bg-brand-dark text-white font-black uppercase text-[10px] tracking-widest shrink-0"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-brand-dark/40 uppercase font-bold tracking-widest mb-3">
                  Adını değiştirmek tüm ürünleri günceller; silmek ürünleri seçtiğiniz kategoriye taşır.
                </p>
                <div className="space-y-2 max-h-[280px] overflow-y-auto no-scrollbar pr-1">
                  {categoryOptions.length === 0 ? (
                    <p className="text-sm text-brand-dark/35 font-medium py-4 text-center">
                      Henüz kategori yok — ürün ekleyince oluşur veya yukarıdan ekleyin.
                    </p>
                  ) : (
                    categoryOptions.map(cat => {
                      const count = items.filter(i => i.category === cat).length;
                      const isRenaming = renameDraft?.old === cat;
                      return (
                        <div
                          key={cat}
                          className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-brand-dark/5"
                        >
                          {isRenaming ? (
                            <>
                              <input
                                className="flex-1 min-w-[140px] bg-brand-muted p-3 rounded-xl border-2 border-transparent focus:border-brand-primary/30 outline-none font-bold text-sm"
                                value={renameDraft.value}
                                onChange={e => setRenameDraft({ ...renameDraft, value: e.target.value })}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveRenameCategory()}
                                className="p-2 rounded-xl bg-brand-primary text-white font-black text-[10px] uppercase tracking-widest px-4"
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenameDraft(null)}
                                className="p-2 rounded-xl bg-brand-muted font-black text-[10px] uppercase"
                              >
                                İptal
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-display font-black uppercase tracking-tight flex-1 min-w-[100px] truncate">
                                {cat}
                              </span>
                              <span className="text-[10px] text-brand-dark/35 font-black uppercase tracking-widest">
                                {count} ürün
                              </span>
                              <button
                                type="button"
                                onClick={() => setRenameDraft({ old: cat, value: cat })}
                                className="p-2 rounded-xl bg-brand-muted text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                title="Yeniden adlandır"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteCategory(cat)}
                                className="p-2 rounded-xl bg-brand-muted text-red-400 hover:bg-red-50 transition-colors"
                                title="Kategoriyi kaldır"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <AnimatePresence>
                {showBulk && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-8"
                  >
                    <div className="p-6 bg-brand-muted rounded-[2.5rem] border-2 border-dashed border-brand-primary/10">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Tutar/Oran</label>
                          <input 
                            type="number"
                            placeholder="Miktar"
                            className="w-full bg-white p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold outline-none"
                            value={bulkAmount}
                            onChange={e => setBulkAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Tür</label>
                          <div className="flex bg-white p-1 rounded-2xl">
                            <button 
                              onClick={() => setBulkType('percent')}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${bulkType === 'percent' ? 'bg-brand-primary text-white' : 'text-brand-dark/30'}`}
                            >
                              Yüzde (%)
                            </button>
                            <button 
                              onClick={() => setBulkType('fixed')}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${bulkType === 'fixed' ? 'bg-brand-primary text-white' : 'text-brand-dark/30'}`}
                            >
                              Sabit (₺)
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">İşlem</label>
                          <div className="flex bg-white p-1 rounded-2xl">
                            <button 
                              onClick={() => setBulkAction('increase')}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${bulkAction === 'increase' ? 'bg-brand-primary text-white' : 'text-brand-dark/30'}`}
                            >
                              <ArrowUpRight size={14} /> Zam
                            </button>
                            <button 
                              onClick={() => setBulkAction('decrease')}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${bulkAction === 'decrease' ? 'bg-brand-primary text-white' : 'text-brand-dark/30'}`}
                            >
                              <ArrowDownRight size={14} /> İndirim
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={handleBulkUpdate}
                          className="w-full py-4 bg-brand-dark text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          UYGULA
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 md:p-4 bg-brand-muted rounded-2xl md:rounded-[2rem] group hover:bg-white border border-transparent hover:border-brand-primary/10 transition-all duration-300 overflow-hidden">
                    <img src={item.image} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover shadow-sm shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-black uppercase tracking-tight truncate text-sm md:text-base leading-tight">{item.name}</p>
                      <p className="text-[9px] md:text-[10px] text-brand-dark/40 font-bold tracking-widest mt-1 truncate">₺{(item.price || 0).toFixed(2)} • {item.category}</p>
                    </div>
                    <div className="flex gap-1 md:gap-2 shrink-0">
                      <button onClick={() => setEditingItem(item)} className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-white shadow-sm border border-brand-dark/5 text-brand-primary hover:bg-brand-primary hover:text-white transition-all">
                        <Edit3 size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                      <button onClick={() => toggleActive(item.id, item.active)} className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-colors ${item.active ? 'text-brand-primary bg-brand-primary/10' : 'text-gray-300 bg-brand-muted'}`}>
                        <CheckCircle2 size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="p-2 md:p-3 rounded-xl md:rounded-2xl text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={async () => {
                    if (confirm('Örnek ürün listesini yüklemek istiyor musun? Menüde 10\'dan az ürün varsa eksikler tamamlanacak.')) {
                      await seedMenu();
                    }
                  }} 
                  className="sm:col-span-2 p-6 border-2 border-dashed border-brand-primary/10 rounded-[2.5rem] bg-brand-muted/30 text-brand-dark/40 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-brand-primary/5 transition-all"
                >
                  <RefreshCw size={14} /> Varsayılan Menüyü Yükle
                </button>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'qr' && (
          <motion.div
            key="qr-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="max-w-md mx-auto"
          >
            <section className="coffee-card p-6 md:p-8 bg-white shadow-xl border border-brand-primary/5">
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                  <QrCode size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-display font-black tracking-tight uppercase">Masa QR Kod</h2>
              </div>

              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Masa Numarası</label>
                  <input 
                    type="text" 
                    placeholder="MASA NO" 
                    className="w-full bg-brand-muted p-4 md:p-6 rounded-[2rem] border-2 border-transparent focus:border-brand-primary/20 transition-all text-center text-2xl md:text-3xl font-display font-black tracking-widest outline-none"
                    value={tableGen}
                    onChange={e => setTableGen(e.target.value)}
                  />
                </div>

                <div className="flex flex-col items-center p-6 md:p-8 bg-brand-muted rounded-[2.5rem] md:rounded-[3rem] border-2 border-dashed border-brand-primary/10">
                  <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl">
                    <QRCodeSVG 
                      value={`${window.location.origin}/?table=${tableGen}`}
                      size={window.innerWidth < 400 ? 140 : 180}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <p className="mt-6 md:mt-8 text-[10px] md:text-[12px] uppercase font-black tracking-[0.5em] text-brand-primary text-center">
                    MASA {tableGen}
                  </p>
                  <p className="mt-2 text-[8px] uppercase font-medium text-brand-dark/30 text-center tracking-widest">
                    Yazıcıdan alırken bu masa no'yu kullanın
                  </p>
                </div>
                
                <button 
                  onClick={() => window.print()}
                  className="w-full py-4 md:py-5 bg-brand-dark text-white rounded-[2rem] font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg shadow-brand-dark/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  QR Kodu Yazdır
                </button>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div
            key="stats-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6 md:space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend Chart */}
              <section className="coffee-card p-6 md:p-8 bg-white shadow-xl border border-brand-primary/5">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-black tracking-tight uppercase">Satış Trendi</h2>
                      <p className="text-[8px] uppercase font-bold text-brand-dark/30 tracking-widest">Son 7 Günlük Performans</p>
                    </div>
                  </div>
                </div>
                
                <div className="min-h-[280px] h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D97706" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D97706" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }} 
                        tickFormatter={(value) => `₺${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '1rem', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#D97706" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Category Popularity Chart */}
              <section className="coffee-card p-6 md:p-8 bg-white shadow-xl border border-brand-primary/5">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                      <PieChartIcon size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-black tracking-tight uppercase">Kategoriler</h2>
                      <p className="text-[8px] uppercase font-bold text-brand-dark/30 tracking-widest">En Çok Tercih Edilen Türler</p>
                    </div>
                  </div>
                </div>

                <div className="min-h-[300px] h-[300px] w-full flex flex-col md:flex-row items-center justify-center gap-8">
                  <div className="w-full max-w-[240px] h-[280px] min-h-[280px] shrink-0 mx-auto md:mx-0 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex-1 space-y-3 w-full">
                    {categoryChartData.map((cat, index) => (
                      <div key={cat.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                          />
                          <span className="text-[10px] font-black uppercase tracking-tight text-brand-dark/60 group-hover:text-brand-dark transition-colors">{cat.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-brand-dark">{cat.value} Adet</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'tables' && (
          <motion.div
            key="tables-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto flex-1">
                <div className="relative w-full md:w-96">
                  <input 
                    type="text"
                    placeholder="MASA ARA (ÖRN: TOKYO)..."
                    className="w-full bg-white px-6 py-4 rounded-2xl shadow-sm border border-brand-dark/5 font-bold text-xs uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                  />
                  <BarChart3 className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-dark/20" size={18} />
                </div>
                <button 
                  onClick={() => setShowAddTable(true)}
                  className="w-full md:w-auto bg-brand-primary text-white px-8 py-4 rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest"
                >
                  <Plus size={16} /> <span>YENİ MASA EKLE</span>
                </button>
              </div>
              
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-dark/30">
                TOPLAM {tables.length} MASA
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tables
                .filter(t => t.name.toLowerCase().includes(tableSearch.toLowerCase()))
                .map(table => (
                  <div key={table.id} className="coffee-card overflow-hidden group !p-0">
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={table.image || getPlaceholderImage(table.name, 'Tables')} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <h3 className="text-white font-display font-black text-xl uppercase tracking-tighter">{table.name}</h3>
                        <div className="flex flex-col gap-2 items-end">
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}
                            className="p-2 bg-red-500/20 text-red-100 rounded-lg hover:bg-red-500 transition-all duration-300"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button 
                            onClick={() => toggleTableActive(table.id)}
                            className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                              table.active ? 'bg-green-500 text-white' : 'bg-red-500 text-white opacity-50'
                            }`}
                          >
                            {table.active ? 'AKTİF' : 'PASİF'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex gap-2">
                      <button 
                        onClick={() => setEditingTable(table)}
                        className="flex-1 py-3 bg-brand-muted text-brand-dark/60 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-primary/10 hover:text-brand-primary transition-all flex items-center justify-center gap-2"
                      >
                        <Edit3 size={12} /> DÜZENLE
                      </button>
                      <button 
                        onClick={() => setTableGen(table.name)}
                        className="p-3 bg-brand-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                        title="QR Oluştur"
                      >
                        <QrCode size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div
            key="logs-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <section className="coffee-card p-6 md:p-8 bg-white border border-brand-primary/5">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl flex items-center gap-2 font-display font-black tracking-tight uppercase">
                  <History size={24} className="text-brand-primary" /> Fiyat Değişiklik Logları
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark/30">Son 100 İşlem</span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-20 bg-brand-muted/30 rounded-[3rem] border-2 border-dashed border-brand-dark/5">
                  <History size={48} className="mx-auto mb-4 text-brand-dark/10" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30">Henüz bir log kaydı bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="bg-brand-muted/50 p-5 rounded-[2rem] border border-brand-dark/5 hover:bg-white hover:shadow-lg transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${log.type === 'bulk' ? 'bg-brand-dark text-white' : 'bg-brand-primary/10 text-brand-primary'}`}>
                            {log.type === 'bulk' ? <RefreshCw size={20} /> : <DollarSign size={20} />}
                          </div>
                          <div>
                            <p className="font-display font-black uppercase tracking-tight text-sm md:text-base leading-tight">{log.itemName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-widest flex items-center gap-1">
                                <User size={10} /> {log.changedBy}
                              </span>
                              <span className="text-brand-dark/10">•</span>
                              <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-widest">
                                {new Date(log.timestamp?.seconds * 1000).toLocaleString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 px-4 py-3 bg-white rounded-2xl md:min-w-[200px] justify-center shadow-sm border border-brand-dark/5">
                          {log.type === 'bulk' ? (
                            <span className="text-[11px] font-black uppercase tracking-widest text-brand-primary">Toplu Güncelleme</span>
                          ) : (
                            <>
                              <div className="text-center leading-none">
                                <span className="text-[8px] font-black uppercase tracking-widest text-brand-dark/30 block mb-1">ESKİ</span>
                                <span className="font-display font-black text-brand-dark/40 line-through">₺{Number(log.oldPrice).toFixed(2)}</span>
                              </div>
                              <ArrowUpRight size={14} className={log.newPrice > log.oldPrice ? 'text-red-500' : 'text-green-500 rotate-90'} />
                              <div className="text-center leading-none">
                                <span className="text-[8px] font-black uppercase tracking-widest text-brand-dark/30 block mb-1">YENİ</span>
                                <span className="font-display font-black text-brand-primary">₺{Number(log.newPrice).toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-brand-dark/95 backdrop-blur-xl p-4 md:p-6 flex items-center justify-center overflow-y-auto"
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block mb-1">Yeni Ürün</span>
                  <h2 className="text-2xl font-display font-black tracking-tight uppercase">ÜRÜN DETAYLARI</h2>
                </div>
                <button onClick={() => setShowAdd(false)} className="p-2 bg-brand-muted rounded-full hover:bg-brand-primary/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="grid gap-4 md:gap-6">
                <div className="flex flex-col items-center gap-4 mb-2">
                  <div className="w-24 h-24 rounded-[2rem] bg-brand-muted overflow-hidden border-4 border-white shadow-xl relative group">
                    <img 
                      src={newItem.image || getPlaceholderImage(newItem.name || 'Coffee', 'Sıcak Kahveler')} 
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Upload size={20} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
                    </label>
                  </div>
                  <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-widest">Ürün Görseli Yükle</span>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Ürün Adı</label>
                  <input 
                    required 
                    autoFocus
                    className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none"
                    value={newItem.name} 
                    onChange={e => setNewItem({...newItem, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Açıklama</label>
                  <textarea 
                    required 
                    className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none min-h-[80px]"
                    value={newItem.description} 
                    onChange={e => setNewItem({...newItem, description: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Fiyat (₺)</label>
                    <input 
                      required 
                      type="number"
                      step="0.01"
                      className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none"
                      value={newItem.price} 
                      onChange={e => setNewItem({...newItem, price: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Kategori</label>
                    <select 
                      className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none appearance-none"
                      value={newItem.category} 
                      onChange={e => setNewItem({...newItem, category: e.target.value})}
                    >
                      {(categoryOptions.length ? categoryOptions : ['Genel']).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
                  ÜRÜNÜ EKLE
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Table Modal */}
      <AnimatePresence>
        {showAddTable && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-brand-dark/95 backdrop-blur-xl p-4 md:p-6 flex items-center justify-center overflow-y-auto"
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block mb-1">Yeni Masa</span>
                  <h2 className="text-2xl font-display font-black tracking-tight uppercase">MASA DETAYLARI</h2>
                </div>
                <button onClick={() => setShowAddTable(false)} className="p-2 bg-brand-muted rounded-full hover:bg-brand-primary/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddTable} className="grid gap-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-40 h-40 rounded-[2.5rem] bg-brand-muted overflow-hidden border-4 border-white shadow-xl relative group">
                    <img 
                      src={newTable.image || getPlaceholderImage(newTable.name || 'Table', 'Tables')} 
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Upload size={24} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
                    </label>
                  </div>
                  <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-widest">Masa Görseli Yükle</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Masa Adı (Örn: Tokyo)</label>
                  <input 
                    required
                    autoFocus
                    className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none"
                    value={newTable.name} 
                    onChange={e => setNewTable({...newTable, name: e.target.value})} 
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                >
                  MASAYI KAYDET
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Table Modal */}
      <AnimatePresence>
        {editingTable && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-brand-dark/95 backdrop-blur-xl p-4 md:p-6 flex items-center justify-center overflow-y-auto"
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block mb-1">Masa Düzenle</span>
                  <h2 className="text-2xl font-display font-black tracking-tight uppercase">{editingTable.name}</h2>
                </div>
                <button onClick={() => setEditingTable(null)} className="p-2 bg-brand-muted rounded-full hover:bg-brand-primary/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-40 h-40 rounded-[2.5rem] bg-brand-muted overflow-hidden border-4 border-white shadow-xl relative group">
                    <img 
                      src={editingTable.image || getPlaceholderImage(editingTable.name, 'Tables')} 
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Upload size={24} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                    </label>
                  </div>
                  <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-widest">Masa Görseli Yükle</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Masa Adı</label>
                  <input 
                    className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none"
                    value={editingTable.name} 
                    onChange={e => setEditingTable({...editingTable, name: e.target.value})} 
                  />
                </div>

                <button 
                  onClick={() => updateTable(editingTable)}
                  className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                >
                  DEĞİŞİKLİKLERİ KAYDET
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-brand-dark/95 backdrop-blur-xl p-4 md:p-6 flex items-center justify-center overflow-y-auto"
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block mb-1">Düzenle</span>
                  <h2 className="text-2xl font-display font-black tracking-tight uppercase">{editingItem.name}</h2>
                </div>
                <button onClick={() => setEditingItem(null)} className="p-2 bg-brand-muted rounded-full hover:bg-brand-primary/10 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditItem} className="grid gap-4 md:gap-6">
                <div className="flex flex-col items-center gap-4 mb-2">
                  <div className="w-24 h-24 rounded-[2rem] bg-brand-muted overflow-hidden border-4 border-white shadow-xl relative group">
                    <img 
                      src={editingItem.image || getPlaceholderImage(editingItem.name, editingItem.category)} 
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Upload size={20} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                    </label>
                  </div>
                  <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-widest">Resmi Değiştir</span>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Ürün Adı</label>
                  <input 
                    required 
                    className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none"
                    value={editingItem.name} 
                    onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Açıklama</label>
                  <textarea 
                    required 
                    className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none min-h-[80px]"
                    value={editingItem.description} 
                    onChange={e => setEditingItem({...editingItem, description: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Fiyat (₺)</label>
                    <input 
                      required 
                      type="number"
                      step="0.01"
                      className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none"
                      value={editingItem.price} 
                      onChange={e => setEditingItem({...editingItem, price: e.target.value as any})} 
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-brand-dark/30 ml-4">Kategori</label>
                    <select 
                      className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent focus:border-brand-primary/20 transition-all font-bold uppercase tracking-tight outline-none appearance-none"
                      value={editingItem.category} 
                      onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                    >
                      {[...new Set([
                        ...(categoryOptions.length ? categoryOptions : ['Genel']),
                        editingItem.category,
                      ])]
                        .sort((a, b) => a.localeCompare(b, 'tr'))
                        .map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-brand-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
                  DEĞİŞİKLİKLERİ KAYDET
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-brand-dark/95 backdrop-blur-xl p-4 flex items-center justify-center"
            onClick={() => setDeleteCategoryModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-display font-black uppercase tracking-tight mb-2">Kategoriyi kaldır</h3>
              <p className="text-sm text-brand-dark/60 mb-6">
                &quot;{deleteCategoryModal.name}&quot; altındaki ürünleri şuraya taşı:
              </p>
              <select
                className="w-full bg-brand-muted p-4 rounded-2xl border-2 border-transparent font-bold mb-6 outline-none"
                value={deleteCategoryModal.moveTo}
                onChange={e =>
                  setDeleteCategoryModal({ ...deleteCategoryModal, moveTo: e.target.value })
                }
              >
                {categoryOptions
                  .filter(c => c !== deleteCategoryModal.name)
                  .map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteCategoryModal(null)}
                  className="flex-1 py-4 rounded-2xl bg-brand-muted font-black uppercase text-[10px] tracking-widest"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteCategory()}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest"
                >
                  Taşı ve sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
