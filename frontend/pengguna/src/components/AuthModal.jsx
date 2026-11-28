import { useState } from 'react';
import { Lock, Mail, Phone, Sparkles, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SisaRasaLogo } from './Logo';

export default function AuthModal() {
  const { authModalOpen, authModalTab, setAuthModalTab, closeAuthModal, login, register } =
    useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const isLogin = authModalTab === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ name, email, phone, password });
      }
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Terjadi kesalahan saat memproses autentikasi. Silakan coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = async () => {
    setError('');
    setSubmitting(true);
    try {
      await login({ email: 'demo@sisarasa.id', password: 'sisarasa123' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal masuk ke akun demo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={closeAuthModal}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E4F0CC]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <SisaRasaLogo size="sm" />
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-full text-[#5A6B55] hover:bg-[#F2FAE0] transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-extrabold text-[#1D2B1A]">
          {isLogin ? 'Masuk ke Akun Konsumen' : 'Daftar Akun Konsumen'}
        </h2>
        <p className="text-xs text-[#5A6B55] mt-1">
          {isLogin
            ? 'Masuk untuk mengklaim voucher flash sale dan melihat riwayat voucher Anda.'
            : 'Buat akun baru untuk mulai menyelamatkan makanan berlebih dengan harga hemat.'}
        </p>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F2FAE0] rounded-xl mt-4">
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('login');
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              isLogin ? 'bg-[#236D1B] text-white shadow-xs' : 'text-[#3F5338]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('register');
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              !isLogin ? 'bg-[#236D1B] text-white shadow-xs' : 'text-[#3F5338]'
            }`}
          >
            Daftar
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-[#2D3E28] mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6B7E65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rina Wijaya"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#D8E8BC] focus:outline-none focus:border-[#236D1B]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#2D3E28] mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B7E65] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#D8E8BC] focus:outline-none focus:border-[#236D1B]"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-[#2D3E28] mb-1">
                Nomor HP (Opsional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6B7E65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#D8E8BC] focus:outline-none focus:border-[#236D1B]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#2D3E28] mb-1">Kata Sandi</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B7E65] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#D8E8BC] focus:outline-none focus:border-[#236D1B]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#236D1B] hover:bg-[#195413] text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Memproses...' : isLogin ? 'Masuk Sekarang' : 'Buat Akun'}
          </button>
        </form>

        {isLogin && (
          <div className="mt-4 pt-4 border-t border-[#E4F0CC]">
            <button
              type="button"
              disabled={submitting}
              onClick={handleDemoFill}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-xs font-bold transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Masuk Cepat dengan Akun Demo (demo@sisarasa.id)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
