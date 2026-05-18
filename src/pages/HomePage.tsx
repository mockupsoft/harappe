import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, QrCode, ArrowRight, Bean, MapPin, X, Search } from 'lucide-react';
import LoadingView from '../components/LoadingView';
import { localDb } from '../lib/localDb';
import { Table } from '../types';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [table, setTable] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    void localDb.getTables().then(setTables).catch(e => console.error('Masalar yüklenemedi:', e));
    const tableParam = searchParams.get('table');
    if (tableParam) {
      setIsRedirecting(true);
      setTable(tableParam);
      localStorage.setItem('temp_table', tableParam);
      setTimeout(() => {
        navigate('/menu');
      }, 800); // Artificial delay for smooth transition
    }
  }, [searchParams, navigate]);

  if (isRedirecting) {
    return <LoadingView fullScreen message={`${table} konumuna saniyeler içinde bağlanıyorsun...`} />;
  }

  const handleStart = () => {
    if (table) {
      localStorage.setItem('temp_table', table);
      navigate('/menu');
    }
  };

  return (
    <div className="p-4 sm:p-6 pt-10 sm:pt-12 max-w-md mx-auto flex flex-col min-h-screen relative overflow-x-hidden">
      {/* Decorative Background Icons */}
      <div className="absolute -top-10 -right-10 text-brand-primary/5 -rotate-12 pointer-events-none">
        <Coffee size={200} />
      </div>
      <div className="absolute top-1/2 -left-20 text-brand-primary/5 rotate-45 pointer-events-none">
        <Bean size={150} />
      </div>
      <div className="absolute -bottom-20 -right-20 text-brand-primary/5 -rotate-45 pointer-events-none">
        <Coffee size={250} />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center mb-8 sm:mb-12"
      >
        <div className="bg-brand-primary text-white p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] mb-4 sm:mb-6 shadow-xl shadow-brand-primary/20">
          <Coffee size={40} className="sm:w-12 sm:h-12" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl sm:text-5xl mb-1 tracking-tighter shrink-0">HARAPPE</h1>
        <p className="text-brand-dark/40 font-display font-bold uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">Kahve & Roastery</p>
      </motion.div>

      <div className="flex-1 space-y-6 sm:space-y-8">
        <div className="coffee-card p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl mb-3 sm:mb-4">Hoş Geldin!</h2>
          <p className="text-brand-dark/50 mb-6 sm:mb-8 text-xs sm:text-sm leading-relaxed font-medium">
            Masandaki QR kodu tarat veya aşağıya masa numaranı girerek Harappe deneyimine hemen başla.
          </p>
          
          <div className="relative mb-6">
            <button 
              onClick={() => setShowTableModal(true)}
              className="w-full bg-brand-muted border-none p-5 rounded-3xl flex items-center justify-between transition-all hover:bg-brand-primary/5 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <MapPin size={24} className="text-brand-primary shrink-0" />
                <span className={`text-left text-xl font-display font-black tracking-widest min-w-0 flex-1 break-words [overflow-wrap:anywhere] line-clamp-2 leading-snug ${table ? 'text-brand-dark' : 'text-brand-dark/20'}`}>
                  {table || 'MASA SEÇ'}
                </span>
              </div>
              <ArrowRight size={20} className="text-brand-primary group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <button 
            onClick={handleStart}
            disabled={!table}
            className="w-full primary-btn flex items-center justify-center gap-3 disabled:opacity-50"
          >
            Lezzetleri Keşfet <ArrowRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4 text-brand-dark/20 px-4">
          <div className="h-px flex-1 bg-brand-dark/10" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-black">Hızlı Tara</span>
          <div className="h-px flex-1 bg-brand-dark/10" />
        </div>

        <div className="flex justify-center">
          <button className="bg-brand-dark text-white p-5 rounded-[2rem] shadow-xl flex items-center gap-4 text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
            <QrCode size={24} className="text-brand-primary" />
            Tarayıcıyı Aç
          </button>
        </div>
      </div>

      <TableModal 
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        tables={tables}
        onSelect={setTable}
        search={tableSearch}
        onSearchChange={setTableSearch}
      />
    </div>
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
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block mb-1">Harappe Coffee</span>
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
