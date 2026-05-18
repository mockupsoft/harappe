import type { MenuItem, Order, OrderStatus, Table, UserProfile } from '../types';

function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const trimmed = raw?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  throw new Error(
    'VITE_API_URL tanımlı değil. .env dosyasına Laragon API kökünü yazın (örn. http://harappe.test/api) veya tarayıcıda aynı kökten çalıştırın.'
  );
}

async function fetchRaw(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBase()}/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchRaw(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${text}`);
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/** auth.php yanıtı (HTTP 4xx olsa bile gövde JSON olabilir). */
export type LocalAuthResponse =
  | { ok: true; uid: string; email: string; displayName: string }
  | { ok: false; code: string; message?: string };

async function fetchAuthJson(path: string, body: Record<string, unknown>): Promise<LocalAuthResponse> {
  const res = await fetchRaw(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!text) {
    return { ok: false, code: 'empty_response' };
  }
  try {
    return JSON.parse(text) as LocalAuthResponse;
  } catch {
    throw new Error(`${path}: geçersiz JSON yanıtı`);
  }
}

export const localDb = {
  getTables: async (): Promise<Table[]> => {
    return fetchJson<Table[]>('tables.php');
  },

  saveTables: async (tables: Table[]): Promise<void> => {
    await fetchJson('tables.php', { method: 'PUT', body: JSON.stringify(tables) });
    window.dispatchEvent(new Event('tables_updated'));
  },

  getLogs: async (): Promise<any[]> => {
    return fetchJson<any[]>('logs.php');
  },

  addLog: async (log: Record<string, unknown>): Promise<any> => {
    const newLog = {
      ...log,
      id: log.id ?? 'log_' + Math.random().toString(36).slice(2, 11),
      timestamp: log.timestamp ?? { seconds: Math.floor(Date.now() / 1000) },
    };
    const saved = await fetchJson<any>('logs.php', {
      method: 'POST',
      body: JSON.stringify(newLog),
    });
    window.dispatchEvent(new Event('logs_updated'));
    return saved;
  },

  getMenu: async (): Promise<MenuItem[]> => {
    return fetchJson<MenuItem[]>('menu.php');
  },

  saveMenu: async (items: MenuItem[]): Promise<void> => {
    await fetchJson('menu.php', { method: 'PUT', body: JSON.stringify(items) });
    window.dispatchEvent(new Event('menu_updated'));
  },

  getOrders: async (): Promise<Order[]> => {
    return fetchJson<Order[]>('orders.php');
  },

  saveOrders: async (orders: Order[]): Promise<void> => {
    await fetchJson('orders.php', { method: 'PUT', body: JSON.stringify(orders) });
    window.dispatchEvent(new Event('orders_updated'));
  },

  addOrder: async (order: Record<string, unknown>): Promise<Order> => {
    const payload = {
      ...order,
      id: order.id ?? 'order_' + Math.random().toString(36).slice(2, 11),
      createdAt: order.createdAt ?? { seconds: Math.floor(Date.now() / 1000) },
    };
    const created = await fetchJson<Order>('orders.php', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    window.dispatchEvent(new Event('orders_updated'));
    return created;
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<void> => {
    await fetchJson('orders.php', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    });
    window.dispatchEvent(new Event('orders_updated'));
  },

  getProfile: async (uid: string): Promise<UserProfile | null> => {
    const data = await fetchJson<UserProfile | null>(
      `profiles.php?uid=${encodeURIComponent(uid)}`
    );
    return data;
  },

  saveProfile: async (profile: UserProfile): Promise<void> => {
    await fetchJson('profiles.php', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    window.dispatchEvent(new Event('profile_updated'));
  },

  /** Sunucuda şifre hashlenir (password_hash); düz şifre veritabanına yazılmaz. */
  registerWithPassword: async (email: string, password: string): Promise<LocalAuthResponse> => {
    return fetchAuthJson('auth.php', { action: 'register', email, password });
  },

  loginWithPassword: async (email: string, password: string): Promise<LocalAuthResponse> => {
    return fetchAuthJson('auth.php', { action: 'login', email, password });
  },

  toggleFavorite: async (uid: string, itemId: string): Promise<void> => {
    const profile = await localDb.getProfile(uid);
    if (!profile) return;

    const favorites = profile.favorites || [];
    const isFav = favorites.includes(itemId);
    const newFavs = isFav ? favorites.filter(i => i !== itemId) : [...favorites, itemId];

    await localDb.saveProfile({ ...profile, favorites: newFavs });
  },
};
