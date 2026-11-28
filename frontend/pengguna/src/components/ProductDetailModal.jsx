import { Clock, MapPin, Store, Tag, X, Zap } from 'lucide-react';
import { formatRupiah } from '../utils/format';

export default function ProductDetailModal({
  product,
  onClose,
  onClaimFlashSale,
  claiming = false,
}) {
  if (!product) return null;

  const hasFlashSale = product.flash_sale_id && product.flash_sale_stock > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#E4F0CC] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image */}
          <div className="relative bg-[#EEF7D8] aspect-square md:aspect-auto">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-[#1E6B18] shadow-xs">
              {product.category}
            </span>
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#3E8E22] uppercase tracking-wide">
                  {product.tenant_code} • {product.tenant_name}
                </p>
                <h2 className="text-2xl font-extrabold text-[#1D2B1A] mt-1">
                  {product.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-[#5A6B55] hover:bg-[#F2FAE0] transition cursor-pointer"
                aria-label="Tutup Detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#4D6346] leading-relaxed mt-3">
              {product.description}
            </p>

            {/* Tenant metadata */}
            <div className="mt-4 p-3.5 rounded-2xl bg-[#F6FBE9] border border-[#E3F0CA] space-y-2 text-xs text-[#3F5338]">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#236D1B] shrink-0" />
                <span>
                  Tenant: <strong className="text-[#1D2B1A]">{product.tenant_name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#236D1B] shrink-0" />
                <span>{product.tenant_address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#236D1B] shrink-0" />
                <span>Jam Operasional: {product.tenant_open_hours}</span>
              </div>
            </div>

            <div className="mt-auto pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#6B7E65] block">Harga Normal</span>
                  <span
                    className={`text-xl font-extrabold ${
                      hasFlashSale ? 'line-through text-[#8A9985] text-base' : 'text-[#1E6B18]'
                    }`}
                  >
                    {formatRupiah(product.price)}
                  </span>
                </div>
                {hasFlashSale && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#DC2626]">
                      <Zap className="w-3.5 h-3.5" /> Harga Flash Sale
                    </span>
                    <span className="block text-2xl font-extrabold text-[#DC2626]">
                      {formatRupiah(product.discount_price)}
                    </span>
                  </div>
                )}
              </div>

              {hasFlashSale ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#4D6346] bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-900">
                      <Tag className="w-3.5 h-3.5" />
                      Best Before: {product.best_before}
                    </span>
                    <span className="font-bold text-amber-900">
                      Sisa {product.flash_sale_stock} porsi
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => onClaimFlashSale(product.flash_sale_id)}
                    className="w-full py-3 px-4 rounded-xl bg-[#236D1B] hover:bg-[#195413] text-white font-bold text-sm transition cursor-pointer disabled:opacity-60"
                  >
                    {claiming ? 'Mengklaim Voucher...' : 'Klaim Voucher Flash Sale'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] font-bold text-sm transition cursor-pointer"
                >
                  Tutup Detail
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
