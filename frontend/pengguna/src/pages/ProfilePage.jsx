import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Leaf, LogIn, Mail, Phone, Ticket, User, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { statsService } from '../services/api';
import { formatRupiah } from '../utils/format';

export default function ProfilePage() {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setImpact(null);
      return;
    }
    statsService
      .getImpact()
      .then(setImpact)
      .catch(() => setImpact(null));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-[#E4F0CC] p-8 shadow-sm">
          <User className="w-12 h-12 text-[#236D1B] mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-[#1D2B1A]">Profil Konsumen</h1>
          <p className="text-sm text-[#5A6B55] mt-2">
            Silakan masuk untuk melihat profil dan kontribusi pengurangan food waste Anda.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#236D1B] text-white text-sm font-bold cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk / Daftar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* User Card */}
      <div className="bg-white rounded-3xl border border-[#E4F0CC] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#236D1B] text-white flex items-center justify-center text-2xl font-extrabold shrink-0">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4F07D] text-[#1A5314] mb-1">
              Akun Konsumen
            </span>
            <h1 className="text-2xl font-extrabold text-[#1D2B1A]">{user.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#5A6B55] mt-1">
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[#3E8E22]" /> {user.email}
              </span>
              {user.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#3E8E22]" /> {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/voucher"
            className="px-5 py-2.5 rounded-full bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-xs sm:text-sm font-bold transition"
          >
            Lihat Voucher Saya
          </Link>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Sustainability Impact Stats */}
      {impact && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#E4F0CC] p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#4D6346]">
                <Ticket className="w-4 h-4 text-[#236D1B]" />
                <span>Porsi Diselamatkan</span>
              </div>
              <p className="text-3xl font-extrabold text-[#1E6B18] mt-2">
                {impact.rescued_meals}
              </p>
              <p className="text-xs text-[#6B7E65] mt-1">
                {impact.active_count} aktif • {impact.used_count} telah ditukar
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E4F0CC] p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#4D6346]">
                <Wallet className="w-4 h-4 text-[#236D1B]" />
                <span>Total Penghematan</span>
              </div>
              <p className="text-3xl font-extrabold text-[#1E6B18] mt-2">
                {formatRupiah(impact.saved_money)}
              </p>
              <p className="text-xs text-[#6B7E65] mt-1">
                Selisih dari harga normal UMKM
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E4F0CC] p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#4D6346]">
                <Leaf className="w-4 h-4 text-[#236D1B]" />
                <span>Estimasi Emisi Dicegah</span>
              </div>
              <p className="text-3xl font-extrabold text-[#1E6B18] mt-2">
                {impact.co2_saved_kg} kg CO₂e
              </p>
              <p className="text-xs text-[#6B7E65] mt-1">
                Kontribusi pengurangan food waste
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E4F0CC] p-6 shadow-sm">
            <h2 className="text-base font-extrabold text-[#1E6B18]">
              Ringkasan Penyelamatan Pangan per Kategori
            </h2>
            <p className="text-xs text-[#5A6B55] mt-0.5 mb-5">
              Jumlah voucher yang telah Anda klaim berdasarkan kategori menu.
            </p>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impact.category_breakdown} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4F0CC" />
                  <XAxis dataKey="category" tick={{ fill: '#3F5338', fontSize: 12, fontWeight: 600 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#5A6B55', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value} voucher`, 'Jumlah']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #D4E9AE',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="jumlah" fill="#3E8E22" radius={[8, 8, 0, 0]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
