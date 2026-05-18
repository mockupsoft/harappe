/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { CartItem, MenuItem, SessionUser, UserProfile } from './types';
import { ShoppingBag, Coffee, ClipboardList, Settings, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { localDb } from './lib/localDb';
import { emailGrantsAdmin, profileIndicatesAdmin } from './lib/adminPolicy';

// --- Contexts ---

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

interface AuthContextType {
  user: SessionUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- Providers ---

const CART_STORAGE_KEY = 'harappe_cart_v1';

function parseStoredCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row: CartItem) =>
        row &&
        typeof row.id === 'string' &&
        typeof row.quantity === 'number' &&
        row.quantity > 0 &&
        typeof row.name === 'string'
    ) as CartItem[];
  } catch {
    return [];
  }
}

function parseSessionUser(raw: string): SessionUser | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (
      !o ||
      typeof o !== 'object' ||
      typeof o.uid !== 'string' ||
      typeof o.email !== 'string'
    ) {
      return null;
    }
    return {
      uid: o.uid,
      email: o.email,
      displayName: typeof o.displayName === 'string' ? o.displayName : null,
    };
  } catch {
    return null;
  }
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: SessionUser) => {
    const email = u.email ?? '';
    const isOwnerEmail = emailGrantsAdmin(email);
    try {
      let p = await localDb.getProfile(u.uid);

      if (!p) {
        p = {
          uid: u.uid,
          name: u.displayName || (email === 'admin@harappe.com' ? 'Admin' : 'Misafir'),
          email,
          rewardPoints: 0,
          isAdmin: isOwnerEmail,
          createdAt: new Date()
        };
        await localDb.saveProfile(p);
      } else if (isOwnerEmail && !p.isAdmin) {
        p.isAdmin = true;
        await localDb.saveProfile(p);
      }
      setProfile(p);
    } catch (e) {
      console.error('Profil yüklenemedi:', e);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem('harappe_session');
    const sessionUser = raw ? parseSessionUser(raw) : null;
    if (sessionUser) {
      setUser(sessionUser);
      void loadProfile(sessionUser);
    }
    setLoading(false);

    const handleUpdate = () => {
      const session = localStorage.getItem('harappe_session');
      const u = session ? parseSessionUser(session) : null;
      if (u) {
        setUser(u);
        void loadProfile(u);
      } else {
        setUser(null);
        setProfile(null);
      }
    };

    window.addEventListener('profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('profile_updated', handleUpdate);
    };
  }, []);

  const isAdmin = profileIndicatesAdmin(profile, user?.email ?? null);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => parseStoredCart());

  useEffect(() => {
    try {
      if (cart.length === 0) {
        sessionStorage.removeItem(CART_STORAGE_KEY);
      } else {
        sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      }
    } catch {
      /* quota / private mode */
    }
  }, [cart]);

  useEffect(() => {
    const onMenu = () => {
      void (async () => {
        try {
          const menu = await localDb.getMenu();
          const menuIds = new Set(menu.map(m => m.id));
          if (menuIds.size === 0) return;
          setCart(prev => prev.filter(r => menuIds.has(r.id)));
        } catch (e) {
          console.error(e);
        }
      })();
    };
    window.addEventListener('menu_updated', onMenu);
    return () => window.removeEventListener('menu_updated', onMenu);
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const nextQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: nextQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

// --- Components ---

const Navbar = () => {
  const { cart } = useCart();
  const { isAdmin } = useAuth();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-[90%] sm:max-w-md sm:mb-6 z-50">
      <div className="bg-brand-dark/95 backdrop-blur-md text-white px-6 py-4 rounded-full flex items-center justify-between shadow-2xl mx-4 mb-6">
        <Link to="/" className={`flex flex-col items-center gap-1 ${location.pathname === '/' || location.pathname === '/menu' ? 'text-white' : 'text-white/50'}`}>
          <Coffee size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Mağaza</span>
        </Link>
        
        {isAdmin && (
          <Link to="/prep" className={`flex flex-col items-center gap-1 ${location.pathname === '/prep' ? 'text-white' : 'text-white/50'}`}>
            <ClipboardList size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Hazırlık</span>
          </Link>
        )}

        {isAdmin && (
          <Link to="/admin" className={`flex flex-col items-center gap-1 ${location.pathname === '/admin' ? 'text-white' : 'text-white/50'}`}>
            <Settings size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Yönetim</span>
          </Link>
        )}

        <Link to="/profile" className={`flex flex-col items-center gap-1 shrink-0 ${location.pathname === '/profile' ? 'text-white' : 'text-white/50'}`}>
          <UserRound size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Profil</span>
        </Link>

        <Link to="/cart" className="relative bg-brand-primary p-3 rounded-2xl active:scale-90 transition-transform shadow-lg shadow-brand-primary/20">
          <motion.div
            key={cart.reduce((a, b) => a + b.quantity, 0)}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3 }}
          >
            <ShoppingBag size={20} />
          </motion.div>
          {cart.length > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-white text-brand-primary text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-brand-primary font-black"
            >
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </motion.span>
          )}
        </Link>
      </div>
    </nav>
  );
};

const PrivateRoute = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to={adminOnly ? '/admin/login' : '/login'} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// --- Pages ---

import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import OrderStatusPage from './pages/OrderStatusPage';
import PrepScreenPage from './pages/PrepScreenPage';
import AdminPage from './pages/AdminPage';
import LoginPage, { StaffLoginPage } from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

import { seedMenu } from './lib/seedMenu';
import { seedTables } from './lib/seedTables';

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/admin/login';

  useEffect(() => {
    void (async () => {
      try {
        await seedMenu();
        await seedTables();
      } catch (e) {
        console.error('Seed:', e);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen pb-32 safe-area-bottom">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<StaffLoginPage />} />
        <Route path="/cart" element={<CartPage />} />
        
        <Route path="/profile" element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        } />
        
        <Route path="/order-status/:orderId" element={
          <PrivateRoute>
            <OrderStatusPage />
          </PrivateRoute>
        } />
        
        <Route path="/prep" element={
          <PrivateRoute adminOnly>
            <PrepScreenPage />
          </PrivateRoute>
        } />
        
        <Route path="/admin" element={
          <PrivateRoute adminOnly>
            <AdminPage />
          </PrivateRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {!hideNavbar && <Navbar />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppContent />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
