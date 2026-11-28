import { useEffect, useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  Clock,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import FlashSaleCard from '../components/FlashSaleCard';
import { useAuth } from '../context/AuthContext';
import { flashSaleService, voucherService } from '../services/api';

const CATEGORIES = ['Makanan', 'Minuman', 'Jajanan'];

const SORT_OPTIONS = [
  { value: 'default', label: 'Urutan Default' },
  { value: 'price_asc', label: 'Harga Diskon Terendah' },
  { value: 'price_desc', label: 'Harga Diskon Tertinggi' },
  { value: 'name_asc', label: 'Nama (A - Z)' },
  { value: 'name_desc', label: 'Nama (Z - A)' },
  { value: 'stock_desc', label: 'Stok Terbanyak' },
];

export default function FlashSalePage() {
  const { isAuthenticated, openAuthModal, showToast } = useAuth();

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('default');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(9);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [claimedFlashIds, setClaimedFlashIds] = useState(new Set());

  const fetchFlashSales = async () => {
    setLoading(true);
    try {
      const res = await flashSaleService.list({
        categories: selectedCategories,
        sortBy,
        search,
        limit,
        offset: 0,
      });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  const syncUserActiveVouchers = async () => {
    if (!isAuthenticated) {
      setClaimedFlashIds(new Set());
      return;
    }
    try {
      const res = await voucherService.list({ status: 'Aktif' });
      setClaimedFlashIds(new Set(res.items.map((v) => v.flash_sale_id)));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchFlashSales();
  }, [selectedCategories, sortBy, search, limit]);

  useEffect(() => {
    syncUserActiveVouchers();
  }, [isAuthenticated]);

  const toggleCategory = (cat) => {
    setLimit(9);
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const executeClaim = async (flashSaleId) => {
    setClaimingId(flashSaleId);
    try {
      const voucher = await voucherService.claim(flashSaleId);
      showToast(
        `Berhasil! Kode voucher ${voucher.voucher_code} telah masuk ke halaman Voucher.`,
        'success'
      );
      await Promise.all([fetchFlashSales(), syncUserActiveVouchers()]);
    } catch (err) {
      showToast(
        err.response?.data?.detail || 'Gagal mengklaim flash sale.',
        'error'
      );
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaim = (item) => {
    if (!isAuthenticated) {
      openAuthModal('login', () => executeClaim(item.id));
      return;
    }
    executeClaim(item.id);
  };

  return (
    <div className="pb-10">
      {/* Green Wavy Header Banner */}
      <div className="relative bg-gradient-to-br from-[#439625] via-[#2F7D1B] to-[#1B5714] text-white pt-10 pb-14 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#D4F07D] text-xs font-bold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Penawaran Waktu Terbatas</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#E9F9B4] tracking-tight">
            Flash Sale
          </h1>
          <p className="text-sm text-white/90 mt-2 max-w-2xl mx-auto">
            Produk di halaman ini adalah makanan berlebih dari tenant mitra yang masih segar,
            higienis, dan layak dikonsumsi, tersedia dengan harga diskon dalam waktu terbatas.
          </p>
        </div>
        <svg
          viewBox="0 0 1440 70"
          className="absolute bottom-0 left-0 w-full h-7 sm:h-10 text-[#F5FCE6]"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,32 C320,75 640,0 960,36 C1200,62 1350,48 1440,28 L1440,70 L0,70 Z"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-5">
        {/* Surplus Food Information Notice */}
        <div className="mb-6 rounded-2xl bg-white border border-[#D4E9AE] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#E4F4C4] text-[#1E6B18] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-[#1D2B1A]">
                Jaminan Kualitas & Kelayakan Konsumsi
              </p>
              <p className="text-[#4D6346]">
                Semua menu flash sale merupakan stok harian berlebih yang masih aman dikonsumsi
                sebelum waktu <strong>Best Before</strong> dan hanya tersedia selama persediaan ada.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full shrink-0 self-start sm:self-center">
            <Clock className="w-3.5 h-3.5" /> Klaim & Tukar Hari Ini
          </span>
        </div>

        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <p className="text-sm sm:text-base font-bold text-[#1D2B1A]">
            Menampilkan {items.length} dari {total} produk flash sale
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-initial sm:w-56">
              <Search className="w-4 h-4 text-[#6B7E65] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setLimit(9);
                  setSearch(e.target.value);
                }}
                placeholder="Cari flash sale..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white rounded-full border border-[#CFE4A8] focus:outline-none focus:border-[#236D1B]"
              />
            </div>

            <div className="inline-flex items-center gap-2 bg-[#D4F07D] px-3.5 py-1.5 rounded-full border border-[#BCE05B]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#1A5314]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Urutkan flash sale"
                className="bg-transparent text-xs sm:text-sm font-bold text-[#1A5314] focus:outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <aside className="lg:col-span-3 bg-white/80 backdrop-blur rounded-2xl border border-[#E4F0CC] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-[#1E6B18] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filter By</span>
              </h2>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-xs font-semibold text-[#3E8E22] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6B55] mb-3">
                Kategori
              </p>
              <div className="space-y-2.5">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 text-sm font-medium text-[#2D3E28] cursor-pointer select-none hover:text-[#1E6B18]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="w-4 h-4 rounded border-[#B7D587] accent-[#236D1B] cursor-pointer"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9">
            {loading && items.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl h-88 animate-pulse border border-[#E4F0CC]"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E4F0CC] p-10 text-center">
                <p className="text-base font-bold text-[#1D2B1A]">
                  Penawaran flash sale tidak ditemukan
                </p>
                <p className="text-sm text-[#5A6B55] mt-1">
                  Coba reset filter kategori atau kata kunci pencarian.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {items.map((item) => (
                  <FlashSaleCard
                    key={item.id}
                    item={item}
                    onClaim={handleClaim}
                    claiming={claimingId === item.id}
                    alreadyClaimed={claimedFlashIds.has(item.id)}
                    showDescription
                  />
                ))}
              </div>
            )}

            {items.length < total && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setLimit((prev) => prev + 6)}
                  className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold border border-[#BCE05B] shadow-xs transition cursor-pointer"
                >
                  <span>Muat Lebih Banyak</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
