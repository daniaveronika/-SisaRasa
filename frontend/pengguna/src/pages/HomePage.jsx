import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Leaf, Sparkles, Zap } from 'lucide-react';
import FlashSaleCard from '../components/FlashSaleCard';
import { HeroEcoBadge } from '../components/Logo';
import ProductCard from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import { useAuth } from '../context/AuthContext';
import { flashSaleService, productService, voucherService } from '../services/api';

export default function HomePage() {
  const { isAuthenticated, openAuthModal, showToast } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [menuLimit, setMenuLimit] = useState(3);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const [flashSales, setFlashSales] = useState([]);
  const [totalFlashSales, setTotalFlashSales] = useState(0);
  const [flashLimit, setFlashLimit] = useState(3);
  const [loadingFlash, setLoadingFlash] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [claimingId, setClaimingId] = useState(null);
  const [claimedFlashIds, setClaimedFlashIds] = useState(new Set());

  const loadMenu = async (limitVal) => {
    setLoadingMenu(true);
    try {
      const res = await productService.list({ limit: limitVal, offset: 0 });
      setProducts(res.items);
      setTotalProducts(res.total);
    } finally {
      setLoadingMenu(false);
    }
  };

  const loadFlashSales = async (limitVal) => {
    setLoadingFlash(true);
    try {
      const res = await flashSaleService.list({ limit: limitVal, offset: 0 });
      setFlashSales(res.items);
      setTotalFlashSales(res.total);
    } finally {
      setLoadingFlash(false);
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
    loadMenu(menuLimit);
  }, [menuLimit]);

  useEffect(() => {
    loadFlashSales(flashLimit);
  }, [flashLimit]);

  useEffect(() => {
    syncUserActiveVouchers();
  }, [isAuthenticated]);

  const executeClaim = async (flashSaleId) => {
    setClaimingId(flashSaleId);
    try {
      const voucher = await voucherService.claim(flashSaleId);
      showToast(
        `Voucher ${voucher.voucher_code} berhasil diklaim! Cek halaman Voucher untuk detail penukaran.`,
        'success'
      );
      setSelectedProduct(null);
      await Promise.all([loadFlashSales(flashLimit), loadMenu(menuLimit), syncUserActiveVouchers()]);
    } catch (err) {
      showToast(
        err.response?.data?.detail || 'Gagal mengklaim voucher flash sale.',
        'error'
      );
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimFlashSale = (itemOrId) => {
    const flashSaleId = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    if (!isAuthenticated) {
      openAuthModal('login', () => executeClaim(flashSaleId));
      return;
    }
    executeClaim(flashSaleId);
  };

  return (
    <div className="space-y-14 pb-8">
      {/* 1. HERO SECTION */}
      <section className="pt-8 sm:pt-12 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E1F4B5] text-[#1A5314] text-xs font-bold">
                <Leaf className="w-3.5 h-3.5 text-[#236D1B]" />
                <span>Gerakan Kurangi Food Waste Bersama UMKM Lokal</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1E6B18] leading-[1.12]">
                Sisa<span className="text-[#4EA82A]">Rasa</span>
              </h1>

              <p className="text-base sm:text-lg text-[#3F5338] leading-relaxed max-w-xl">
                Selamatkan makanan berlebih yang masih segar dan layak konsumsi dari UMKM katering
                serta restoran terpercaya. Dapatkan hidangan favoritmu dengan harga hemat melalui
                penawaran flash sale dan voucher digital setiap hari.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#236D1B] hover:bg-[#195413] text-white text-sm font-bold shadow-sm transition"
                >
                  <span>Jelajahi Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/flash-sale"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold transition"
                >
                  <Zap className="w-4 h-4" />
                  <span>Lihat Flash Sale</span>
                </Link>
              </div>

              {/* Subtle food highlight strip */}
              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-[#4D6346]">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4 text-[#3E8E22]" /> Diskon hingga 45%
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Leaf className="w-4 h-4 text-[#3E8E22]" /> 100% Layak Konsumsi
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  Voucher Instan di Kasir
                </span>
              </div>
            </div>

            {/* Right Visual */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative">
                <HeroEcoBadge />
                {/* Floating appetizing food preview card */}
                <div className="hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur px-3.5 py-2.5 rounded-2xl shadow-lg border border-[#E4F0CC] absolute -bottom-2 -left-4">
                  <img
                    src="/images/ayam-kremes.jpg"
                    alt="Ayam Kremes"
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="text-left">
                    <p className="text-[11px] text-[#6B7E65] font-medium">Yes Resto • Flash Sale</p>
                    <p className="text-xs font-bold text-[#1D2B1A]">Ayam Kremes</p>
                    <p className="text-xs font-extrabold text-[#DC2626]">Rp 15.000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OUR MENU SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E6B18] tracking-tight uppercase">
              OUR MENU
            </h2>
            <p className="text-sm text-[#4D6346] mt-1">
              Pilihan hidangan unggulan dari tenant UMKM dan katering mitra SisaRasa.
            </p>
          </div>
          <Link
            to="/menu"
            className="text-sm font-bold text-[#236D1B] hover:underline inline-flex items-center gap-1"
          >
            <span>Lihat semua menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingMenu && products.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-[#E4F0CC]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetail={setSelectedProduct}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          {products.length < totalProducts ? (
            <button
              type="button"
              onClick={() => setMenuLimit((prev) => prev + 3)}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold border border-[#BCE05B] shadow-xs transition cursor-pointer"
            >
              <span>Muat Lebih Banyak</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/menu')}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold border border-[#BCE05B] shadow-xs transition cursor-pointer"
            >
              <span>Jelajahi Halaman Menu Kita</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* 3. FLASH SALE SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E6B18] tracking-tight uppercase">
              FLASH SALE
            </h2>
            <p className="text-sm text-[#4D6346] mt-1">
              Makanan berlebih layak konsumsi dengan harga spesial. Klaim voucher sebelum stok habis!
            </p>
          </div>
          <Link
            to="/flash-sale"
            className="text-sm font-bold text-[#236D1B] hover:underline inline-flex items-center gap-1"
          >
            <span>Lihat semua flash sale</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingFlash && flashSales.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-84 animate-pulse border border-[#E4F0CC]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashSales.map((item) => (
              <FlashSaleCard
                key={item.id}
                item={item}
                onClaim={handleClaimFlashSale}
                claiming={claimingId === item.id}
                alreadyClaimed={claimedFlashIds.has(item.id)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          {flashSales.length < totalFlashSales ? (
            <button
              type="button"
              onClick={() => setFlashLimit((prev) => prev + 3)}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold border border-[#BCE05B] shadow-xs transition cursor-pointer"
            >
              <span>Muat Lebih Banyak</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/flash-sale')}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold border border-[#BCE05B] shadow-xs transition cursor-pointer"
            >
              <span>Buka Halaman Flash Sale</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onClaimFlashSale={handleClaimFlashSale}
        claiming={claimingId !== null}
      />
    </div>
  );
}
