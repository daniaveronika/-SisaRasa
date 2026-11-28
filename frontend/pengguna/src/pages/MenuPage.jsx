import { useEffect, useState } from 'react';
import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import { useAuth } from '../context/AuthContext';
import { productService, voucherService } from '../services/api';

const CATEGORIES = ['Makanan', 'Minuman', 'Jajanan'];

const SORT_OPTIONS = [
  { value: 'default', label: 'Urutan Default' },
  { value: 'name_asc', label: 'Nama (A - Z)' },
  { value: 'name_desc', label: 'Nama (Z - A)' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
];

export default function MenuPage() {
  const { isAuthenticated, openAuthModal, showToast } = useAuth();

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('default');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(9);

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.list({
        categories: selectedCategories,
        sortBy,
        search,
        limit,
        offset: 0,
      });
      setProducts(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategories, sortBy, search, limit]);

  const toggleCategory = (cat) => {
    setLimit(9);
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const executeClaim = async (flashSaleId) => {
    setClaiming(true);
    try {
      const voucher = await voucherService.claim(flashSaleId);
      showToast(
        `Voucher ${voucher.voucher_code} berhasil diklaim! Cek halaman Voucher.`,
        'success'
      );
      setSelectedProduct(null);
      await fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Gagal mengklaim voucher.', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimFlashSale = (flashSaleId) => {
    if (!isAuthenticated) {
      openAuthModal('login', () => executeClaim(flashSaleId));
      return;
    }
    executeClaim(flashSaleId);
  };

  return (
    <div className="pb-10">
      {/* Green Wavy Header Banner matching mockup */}
      <div className="relative bg-gradient-to-br from-[#439625] via-[#2F7D1B] to-[#1B5714] text-white pt-10 pb-14 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#E9F9B4] tracking-tight">
            Menu Kita
          </h1>
          <p className="text-sm text-white/90 mt-2 max-w-xl mx-auto">
            Temukan beragam pilihan makanan, minuman, dan jajanan berkualitas dari mitra UMKM
            katering SisaRasa.
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
        {/* Top bar: count, search, sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <p className="text-sm sm:text-base font-bold text-[#1D2B1A]">
            Menampilkan {products.length} dari {total} produk
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
                placeholder="Cari menu atau tenant..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white rounded-full border border-[#CFE4A8] focus:outline-none focus:border-[#236D1B]"
              />
            </div>

            <div className="inline-flex items-center gap-2 bg-[#D4F07D] px-3.5 py-1.5 rounded-full border border-[#BCE05B]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#1A5314]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Urutkan produk"
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

        {/* Main Content: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Sidebar Filter By */}
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
                {CATEGORIES.map((cat) => {
                  const checked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2.5 text-sm font-medium text-[#2D3E28] cursor-pointer select-none hover:text-[#1E6B18]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat)}
                        className="w-4 h-4 rounded border-[#B7D587] accent-[#236D1B] cursor-pointer"
                      />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-9">
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl h-80 animate-pulse border border-[#E4F0CC]"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E4F0CC] p-10 text-center">
                <p className="text-base font-bold text-[#1D2B1A]">
                  Produk tidak ditemukan
                </p>
                <p className="text-sm text-[#5A6B55] mt-1">
                  Coba ubah filter kategori atau kata kunci pencarian Anda.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSearch('');
                    setSortBy('default');
                  }}
                  className="mt-4 px-5 py-2 rounded-full bg-[#D4F07D] text-[#1A5314] text-xs font-bold cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetail={setSelectedProduct}
                    showDescription
                  />
                ))}
              </div>
            )}

            {products.length < total && (
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

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onClaimFlashSale={handleClaimFlashSale}
        claiming={claiming}
      />
    </div>
  );
}
