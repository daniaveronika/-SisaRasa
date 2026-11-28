import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService, clearStoredAuth, getStoredAuth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth().user);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [pendingCallback, setPendingCallback] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const { token } = getStoredAuth();
    if (!token) return;
    authService
      .getMe()
      .then((freshUser) => setUser(freshUser))
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      });
  }, []);

  const openAuthModal = useCallback((tab = 'login', onAfterAuth = null) => {
    setAuthModalTab(tab);
    setPendingCallback(() => onAfterAuth);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setPendingCallback(null);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const data = await authService.login(credentials);
      setUser(data.user);
      setAuthModalOpen(false);
      showToast(`Selamat datang kembali, ${data.user.name}!`, 'success');
      if (pendingCallback) {
        const cb = pendingCallback;
        setPendingCallback(null);
        await cb();
      }
      return data.user;
    },
    [pendingCallback, showToast]
  );

  const register = useCallback(
    async (payload) => {
      const data = await authService.register(payload);
      setUser(data.user);
      setAuthModalOpen(false);
      showToast(`Akun berhasil dibuat! Selamat datang, ${data.user.name}.`, 'success');
      if (pendingCallback) {
        const cb = pendingCallback;
        setPendingCallback(null);
        await cb();
      }
      return data.user;
    },
    [pendingCallback, showToast]
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    showToast('Anda telah keluar dari akun.', 'info');
  }, [showToast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        authModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        toast,
        showToast,
        dismissToast: () => setToast(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
}
