export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  active: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id?: string;
  tableNum: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
  discount?: number;
  freeItemId?: string;
  status: OrderStatus;
  notes?: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  rewardPoints: number;
  isAdmin?: boolean;
  favorites?: string[];
  createdAt: any;
}

/** Oturum (localStorage / AuthProvider); Firebase User yerine. */
export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface PriceLog {
  id: string;
  itemId: string;
  itemName: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string; // user email
  timestamp: any; // Date
  type: 'individual' | 'bulk';
}

export interface Table {
  id: string;
  name: string;
  image?: string;
  active: boolean;
}
