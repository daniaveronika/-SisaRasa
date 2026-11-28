import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, LogIn, Search, Ticket, Zap } from 'lucide-react';
import VoucherDetailModal from '../components/VoucherDetailModal';
import { useAuth } from '../context/AuthContext';
import { voucherService } from '../services/api';
import { formatDateTimeID, formatRupiah } from '../utils/format';

const STATUS_TABS = ['Semua', 'Aktif', 'Digunakan', 'Kedaluwarsa'];

const STATUS_BADGE = {
  Aktif: 'bg-[#D4F07D] text-[#1A5314] border-[#B9E24C]',
  Digunakan: 'bg-slate-100 text-slate-700 border-slate-300',
  Kedaluwarsa: 'bg-red-50 text-red-700 border-red-200',
};

export default function VoucherPage() {
  const { isAuthenticated, openAuthModal, showToast } = useAuth();

  const [statusFilter, setStatusFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  const fetchVouchers = async () => {
    if (!isAuthenticated) {
      setVouchers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await voucherService.list({ status: statusFilter, search });
      setVouchers(res.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [isAuthenticated, statusFilter, search]);

  const handleConfirmRedeem = async (voucherId) => {
    setRedeeming(true);
    try {
      const updated = await voucherService.redeem(voucherId);
      setSelectedVoucher(updated);
      showToast(
        `Voucher ${updated.voucher_code} telah ditandai sebagai Digunakan.`,
        'success'
      );
      await fetchVouchers();
    } catch (err) {
      showToast(
        err.response?.data?.detail || 'Gagal memperbarui status voucher.',
        'error'
      );
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 min-h-[70vh]">
      {/* Header matching mockup */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#1E6B18] tracking-tight">Voucher</h1>
        <p className="text-sm text-[#4D6346] mt-1">
          Kelola voucher makanan berlebih yang telah Anda klaim dan tunjukkan kode unik ke kasir
          tenant mitra.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="bg-white rounded-3xl border border-[#E4F0CC] p-8 sm:p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#E4F4C4] text-[#236D1B] flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-[#1D2B1A]">
            Masuk untuk Melihat Voucher Anda
          </h2>
          <p className="text-sm text-[#5A6B55] mt-2 leading-relaxed">
            Setiap voucher flash sale yang Anda klaim tersimpan aman di akun Anda lengkap dengan
            kode penukaran unik dan status penggunaannya.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#236D1B] hover:bg-[#195413] text-white text-sm font-bold transition cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk / Daftar Akun</span>
          </button>
        </div>
      ) : (
        <>
          {/* Filter Pills + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer border ${
                      active
                        ? 'bg-[#D4F07D] text-[#1A5314] border-[#B9E24C] shadow-xs'
                        : 'bg-white text-[#3F5338] border-[#DCEBBF] hover:bg-[#F2FAE0]'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#6B7E65] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari voucher atau kode..."
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white rounded-full border border-[#CFE4A8] focus:outline-none focus:border-[#236D1B]"
              />
            </div>
          </div>

          {loading && vouchers.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl h-80 animate-pulse border border-[#E4F0CC]"
                />
              ))}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E4F0CC] p-10 text-center">
              <Ticket className="w-10 h-10 text-[#65B832] mx-auto mb-3" />
              <h3 className="text-lg font-extrabold text-[#1D2B1A]">
                Belum ada voucher {statusFilter !== 'Semua' ? `dengan status "${statusFilter}"` : ''}
              </h3>
              <p className="text-sm text-[#5A6B55] mt-1 max-w-md mx-auto">
                Jelajahi halaman Flash Sale untuk mengklaim makanan berlebih berkualitas dengan
                harga diskon spesial!
              </p>
              <Link
                to="/flash-sale"
                className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#236D1B] hover:bg-[#195413] text-white text-sm font-bold transition"
              >
                <Zap className="w-4 h-4" />
                <span>Lihat Flash Sale</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vouchers.map((voucher) => (
                <article
                  key={voucher.id}
                  className="bg-white rounded-2xl border border-[#E4F0CC] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
                >
                  <div className="p-3 pb-0">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EEF7D8]">
                      <img
                        src={voucher.image_url}
                        alt={voucher.product_name}
                        loading="lazy"
                        className={`w-full h-full object-cover ${
                          voucher.status === 'Kedaluwarsa' ? 'grayscale opacity-75' : ''
                        }`}
                      />
                      <span
                        className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${
                          STATUS_BADGE[voucher.status] || STATUS_BADGE.Aktif
                        }`}
                      >
                        {voucher.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-xs font-medium text-[#6B7E65]">
                      {voucher.tenant_code} - {voucher.tenant_name}
                    </p>
                    <h3 className="text-base font-bold text-[#1D2B1A] mt-0.5 line-clamp-1">
                      {voucher.product_name}
                    </h3>

                    <div className="mt-2.5 flex items-center justify-between text-xs bg-[#F6FBE9] border border-[#E3F0CA] px-3 py-2 rounded-xl">
                      <span className="text-[#4D6346] font-medium">Kode Voucher</span>
                      <span className="font-mono font-extrabold text-[#1A5314] tracking-wider">
                        {voucher.voucher_code}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[#5A6B55]">
                      <Clock className="w-3.5 h-3.5 text-[#3E8E22] shrink-0" />
                      <span className="truncate">
                        Berlaku s/d {formatDateTimeID(voucher.expires_at)}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-[#6B7E65]">Harga Voucher</span>
                        <span className="text-base font-extrabold text-[#DC2626]">
                          {formatRupiah(voucher.price_paid)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedVoucher(voucher)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold border border-[#BCE05B] transition cursor-pointer"
                      >
                        <span>Lihat Detail Voucher</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <VoucherDetailModal
        voucher={selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        onCopyCode={(code) => showToast(`Kode voucher ${code} disalin!`, 'info')}
        onConfirmRedeem={handleConfirmRedeem}
        redeeming={redeeming}
      />
    </div>
  );
}
