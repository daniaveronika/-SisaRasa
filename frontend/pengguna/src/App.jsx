import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import FlashSalePage from './pages/FlashSalePage';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import ProfilePage from './pages/ProfilePage';
import VoucherPage from './pages/VoucherPage';

function ToastBanner() {
  const { toast, dismissToast } = useAuth();
  if (!toast) return null;

  const styleMap = {
    success: 'bg-[#1E6B18] text-white border-[#144C10]',
    error: 'bg-red-600 text-white border-red-700',
    info: 'bg-slate-800 text-white border-slate-900',
  };

  const Icon =
    toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full px-4 sm:px-0">
      <div
        className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-xl border ${
          styleMap[toast.type] || styleMap.success
        }`}
      >
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm font-semibold flex-1 leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={dismissToast}
          className="p-0.5 rounded-full hover:bg-white/15 cursor-pointer"
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#F5FCE6]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/flash-sale" element={<FlashSalePage />} />
              <Route path="/voucher" element={<VoucherPage />} />
              <Route path="/profil" element={<ProfilePage />} />
            </Routes>
          </main>
          <Footer />
          <AuthModal />
          <ToastBanner />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
