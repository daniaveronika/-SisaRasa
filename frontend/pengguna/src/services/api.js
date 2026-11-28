import axios from 'axios';
import {
  DEMO_USER,
  INITIAL_DEMO_VOUCHERS,
  INITIAL_FLASH_SALES,
  INITIAL_PRODUCTS,
} from '../data/demoData';

const TOKEN_KEY = 'sisarasa_token';
const USER_KEY = 'sisarasa_user';
const FALLBACK_FLASH_KEY = 'sisarasa_fallback_flash_sales';
const FALLBACK_VOUCHERS_KEY = 'sisarasa_fallback_vouchers';
const FALLBACK_USERS_KEY = 'sisarasa_fallback_users';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isNetworkUnavailable(err) {
  return !err.response && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.message?.includes('Network'));
}

function getFallbackFlashSales() {
  const raw = localStorage.getItem(FALLBACK_FLASH_KEY);
  if (!raw) {
    localStorage.setItem(FALLBACK_FLASH_KEY, JSON.stringify(INITIAL_FLASH_SALES));
    return [...INITIAL_FLASH_SALES];
  }
  return JSON.parse(raw);
}

function saveFallbackFlashSales(list) {
  localStorage.setItem(FALLBACK_FLASH_KEY, JSON.stringify(list));
}

function getFallbackVouchers(userId) {
  const raw = localStorage.getItem(FALLBACK_VOUCHERS_KEY);
  let all;
  if (!raw) {
    all = [...INITIAL_DEMO_VOUCHERS];
    localStorage.setItem(FALLBACK_VOUCHERS_KEY, JSON.stringify(all));
  } else {
    all = JSON.parse(raw);
  }
  const nowIso = new Date().toISOString().slice(0, 19);
  let changed = false;
  all = all.map((v) => {
    if (v.status === 'Aktif' && v.expires_at < nowIso) {
      changed = true;
      return { ...v, status: 'Kedaluwarsa' };
    }
    return v;
  });
  if (changed) {
    localStorage.setItem(FALLBACK_VOUCHERS_KEY, JSON.stringify(all));
  }
  return userId ? all.filter((v) => v.user_id === userId) : all;
}

function saveFallbackVouchers(all) {
  localStorage.setItem(FALLBACK_VOUCHERS_KEY, JSON.stringify(all));
}

function getFallbackUsers() {
  const raw = localStorage.getItem(FALLBACK_USERS_KEY);
  if (!raw) {
    const initial = [{ ...DEMO_USER, password: 'sisarasa123' }];
    localStorage.setItem(FALLBACK_USERS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

export function getStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return { token: null, user: null };
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return { token: null, user: null };
  }
}

export function setStoredAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const authService = {
  async login({ email, password }) {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setStoredAuth(data.access_token, data.user);
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      const users = getFallbackUsers();
      const found = users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (!found) {
        const error = new Error('Email atau kata sandi tidak sesuai.');
        error.response = { data: { detail: 'Email atau kata sandi tidak sesuai.' } };
        throw error;
      }
      const { password: _pw, ...user } = found;
      const token = `fallback-token-${user.id}`;
      setStoredAuth(token, user);
      return { access_token: token, token_type: 'bearer', user };
    }
  },

  async register({ name, email, password, phone = '' }) {
    try {
      const { data } = await api.post('/auth/register', { name, email, password, phone });
      setStoredAuth(data.access_token, data.user);
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      const users = getFallbackUsers();
      const lowerEmail = email.trim().toLowerCase();
      if (users.some((u) => u.email.toLowerCase() === lowerEmail)) {
        const error = new Error('Email sudah terdaftar.');
        error.response = { data: { detail: 'Email sudah terdaftar. Silakan masuk menggunakan akun Anda.' } };
        throw error;
      }
      const newUser = {
        id: users.length + 1,
        name: name.trim(),
        email: lowerEmail,
        phone: phone.trim(),
        password,
        created_at: new Date().toISOString().slice(0, 19),
      };
      users.push(newUser);
      localStorage.setItem(FALLBACK_USERS_KEY, JSON.stringify(users));
      const { password: _pw, ...user } = newUser;
      const token = `fallback-token-${user.id}`;
      setStoredAuth(token, user);
      return { access_token: token, token_type: 'bearer', user };
    }
  },

  async getMe() {
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      const { user } = getStoredAuth();
      if (!user) throw err;
      return user;
    }
  },
};

export const productService = {
  async list({ categories = [], sortBy = 'default', search = '', featured = null, limit = null, offset = 0 } = {}) {
    try {
      const params = { sort_by: sortBy, offset };
      if (categories.length > 0) params.category = categories.join(',');
      if (search.trim()) params.search = search.trim();
      if (featured !== null) params.featured = featured;
      if (limit !== null) params.limit = limit;
      const { data } = await api.get('/products', { params });
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      let items = [...INITIAL_PRODUCTS];
      if (categories.length > 0) {
        items = items.filter((p) => categories.includes(p.category));
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tenant_name.toLowerCase().includes(q)
        );
      }
      if (featured !== null) {
        items = items.filter((p) => p.is_featured === featured);
      }
      if (sortBy === 'name_asc') items.sort((a, b) => a.name.localeCompare(b.name));
      else if (sortBy === 'name_desc') items.sort((a, b) => b.name.localeCompare(a.name));
      else if (sortBy === 'price_asc') items.sort((a, b) => a.price - b.price);
      else if (sortBy === 'price_desc') items.sort((a, b) => b.price - a.price);
      const total = items.length;
      if (limit !== null) items = items.slice(offset, offset + limit);
      return { items, total };
    }
  },
};

export const flashSaleService = {
  async list({ categories = [], sortBy = 'default', search = '', limit = null, offset = 0 } = {}) {
    try {
      const params = { sort_by: sortBy, offset };
      if (categories.length > 0) params.category = categories.join(',');
      if (search.trim()) params.search = search.trim();
      if (limit !== null) params.limit = limit;
      const { data } = await api.get('/flash-sales', { params });
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      let items = getFallbackFlashSales();
      if (categories.length > 0) {
        items = items.filter((p) => categories.includes(p.category));
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tenant_name.toLowerCase().includes(q)
        );
      }
      if (sortBy === 'name_asc') items.sort((a, b) => a.name.localeCompare(b.name));
      else if (sortBy === 'name_desc') items.sort((a, b) => b.name.localeCompare(a.name));
      else if (sortBy === 'price_asc') items.sort((a, b) => a.discount_price - b.discount_price);
      else if (sortBy === 'price_desc') items.sort((a, b) => b.discount_price - a.discount_price);
      else if (sortBy === 'stock_desc') items.sort((a, b) => b.stock - a.stock);
      const total = items.length;
      if (limit !== null) items = items.slice(offset, offset + limit);
      return { items, total };
    }
  },
};

export const voucherService = {
  async list({ status = 'Semua', search = '' } = {}) {
    try {
      const params = {};
      if (status && status !== 'Semua') params.status = status;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/vouchers', { params });
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      const { user } = getStoredAuth();
      if (!user) return { items: [], total: 0 };
      let items = getFallbackVouchers(user.id);
      if (status && status !== 'Semua') {
        items = items.filter((v) => v.status === status);
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        items = items.filter(
          (v) =>
            v.product_name.toLowerCase().includes(q) ||
            v.tenant_name.toLowerCase().includes(q) ||
            v.voucher_code.toLowerCase().includes(q)
        );
      }
      return { items, total: items.length };
    }
  },

  async claim(flashSaleId) {
    try {
      const { data } = await api.post('/vouchers/claim', { flash_sale_id: flashSaleId });
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      const { user } = getStoredAuth();
      if (!user) {
        const error = new Error('Silakan masuk terlebih dahulu.');
        error.response = { status: 401, data: { detail: 'Silakan masuk terlebih dahulu.' } };
        throw error;
      }
      const flashSales = getFallbackFlashSales();
      const idx = flashSales.findIndex((f) => f.id === flashSaleId);
      if (idx === -1 || flashSales[idx].stock <= 0) {
        const error = new Error('Stok habis.');
        error.response = { status: 409, data: { detail: 'Maaf, stok flash sale untuk produk ini sudah habis.' } };
        throw error;
      }
      const allVouchers = getFallbackVouchers();
      const duplicate = allVouchers.find(
        (v) => v.user_id === user.id && v.flash_sale_id === flashSaleId && v.status === 'Aktif'
      );
      if (duplicate) {
        const error = new Error('Voucher aktif sudah ada.');
        error.response = {
          status: 409,
          data: { detail: 'Anda sudah memiliki voucher aktif untuk produk flash sale ini. Silakan cek halaman Voucher.' },
        };
        throw error;
      }
      const fs = flashSales[idx];
      flashSales[idx] = { ...fs, stock: fs.stock - 1 };
      saveFallbackFlashSales(flashSales);

      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const num = Math.floor(1000 + Math.random() * 9000);
      const newVoucher = {
        id: allVouchers.length + 1,
        user_id: user.id,
        flash_sale_id: fs.id,
        product_id: fs.product_id,
        tenant_id: fs.tenant_id,
        tenant_code: fs.tenant_code,
        tenant_name: fs.tenant_name,
        tenant_address: fs.tenant_address,
        tenant_open_hours: fs.tenant_open_hours,
        product_name: fs.name,
        product_category: fs.category,
        product_description: fs.description,
        image_url: fs.image_url,
        normal_price: fs.normal_price,
        voucher_code: `SR-${fs.tenant_code.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${num}${rand.slice(0, 2)}`,
        price_paid: fs.discount_price,
        best_before: fs.best_before,
        expires_at: fs.expires_at,
        status: 'Aktif',
        claimed_at: new Date().toISOString().slice(0, 19),
        used_at: null,
      };
      allVouchers.unshift(newVoucher);
      saveFallbackVouchers(allVouchers);
      return newVoucher;
    }
  },

  async redeem(voucherId) {
    try {
      const { data } = await api.post(`/vouchers/${voucherId}/redeem`);
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      const allVouchers = getFallbackVouchers();
      const idx = allVouchers.findIndex((v) => v.id === voucherId);
      if (idx === -1) throw err;
      if (allVouchers[idx].status !== 'Aktif') {
        const error = new Error('Voucher tidak aktif.');
        error.response = {
          status: 409,
          data: { detail: 'Voucher ini sudah digunakan atau kedaluwarsa.' },
        };
        throw error;
      }
      allVouchers[idx] = {
        ...allVouchers[idx],
        status: 'Digunakan',
        used_at: new Date().toISOString().slice(0, 19),
      };
      saveFallbackVouchers(allVouchers);
      return allVouchers[idx];
    }
  },
};

export const statsService = {
  async getImpact() {
    try {
      const { data } = await api.get('/stats/impact');
      return data;
    } catch (err) {
      if (!isNetworkUnavailable(err)) throw err;
      const { user } = getStoredAuth();
      const vouchers = user ? getFallbackVouchers(user.id) : [];
      const active_count = vouchers.filter((v) => v.status === 'Aktif').length;
      const used_count = vouchers.filter((v) => v.status === 'Digunakan').length;
      const rescued_meals = vouchers.filter((v) => v.status !== 'Kedaluwarsa').length;
      const saved_money = vouchers
        .filter((v) => v.status !== 'Kedaluwarsa')
        .reduce((acc, v) => acc + Math.max(0, v.normal_price - v.price_paid), 0);
      const cats = { Makanan: 0, Minuman: 0, Jajanan: 0 };
      vouchers.forEach((v) => {
        if (cats[v.product_category] !== undefined) cats[v.product_category] += 1;
      });
      return {
        total_vouchers: vouchers.length,
        active_count,
        used_count,
        rescued_meals,
        saved_money,
        co2_saved_kg: Number((rescued_meals * 0.85).toFixed(2)),
        category_breakdown: Object.entries(cats).map(([category, jumlah]) => ({ category, jumlah })),
      };
    }
  },
};
