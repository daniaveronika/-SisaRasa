import { ChevronRight, Clock, PackageCheck } from 'lucide-react';
import { formatRupiah } from '../utils/format';

export default function FlashSaleCard({
  item,
  onClaim,
  claiming = false,
  alreadyClaimed = false,
  showDescription = false,
}) {
  const isOutOfStock = item.stock <= 0;

  return (
    <article className="bg-white rounded-2xl border border-[#E4F0CC] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      <div className="p-3 pb-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EEF7D8]">
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isOutOfStock ? 'grayscale opacity-70' : 'group-hover:scale-105'
            }`}
          />
          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DC2626] text-white shadow-xs">
            Hemat {item.discount_percent}%
          </span>
          <span
            className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shadow-xs ${
              isOutOfStock
                ? 'bg-gray-800/85 text-white'
                : 'bg-white/95 text-[#1A5314]'
            }`}
          >
            {isOutOfStock ? 'Stok Habis' : `Sisa ${item.stock} porsi`}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <p className="text-xs font-medium text-[#6B7E65]">
          {item.tenant_code} - {item.tenant_name}
        </p>
        <h3 className="text-base font-bold text-[#1D2B1A] mt-0.5 line-clamp-1">
          {item.name}
        </h3>

        {showDescription && (
          <p className="text-xs text-[#5A6B55] mt-1.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="mt-2.5 space-y-1 text-xs text-[#4D6346]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#3E8E22] shrink-0" />
            <span>Best Before: <strong className="text-[#1D2B1A]">{item.best_before}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5 text-[#3E8E22] shrink-0" />
            <span>Stok tersedia: <strong className="text-[#1D2B1A]">{item.stock}</strong></span>
          </div>
        </div>

        <div className="mt-auto pt-3 space-y-3">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-sm text-[#8A9985] line-through">
              {formatRupiah(item.normal_price)}
            </span>
            <span className="text-lg font-extrabold text-[#DC2626]">
              {formatRupiah(item.discount_price)}
            </span>
          </div>

          <button
            type="button"
            disabled={isOutOfStock || claiming || alreadyClaimed}
            onClick={() => onClaim(item)}
            className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-semibold transition ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : alreadyClaimed
                ? 'bg-[#D4F07D] text-[#1A5314] cursor-default'
                : 'bg-[#236D1B] hover:bg-[#195413] text-white cursor-pointer'
            }`}
          >
            <span>
              {claiming
                ? 'Memproses...'
                : isOutOfStock
                ? 'Stok Habis'
                : alreadyClaimed
                ? 'Voucher Sudah Diklaim'
                : 'Klaim Flash Sale'}
            </span>
            {!isOutOfStock && !alreadyClaimed && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
