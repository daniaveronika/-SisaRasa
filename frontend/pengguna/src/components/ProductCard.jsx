import { ChevronRight } from 'lucide-react';
import { formatRupiah } from '../utils/format';

export default function ProductCard({ product, onViewDetail, showDescription = false }) {
  return (
    <article className="bg-white rounded-2xl border border-[#E4F0CC] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      <div className="p-3 pb-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EEF7D8]">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-[#1E6B18] shadow-xs">
            {product.category}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <p className="text-xs font-medium text-[#6B7E65]">
          {product.tenant_code} - {product.tenant_name}
        </p>
        <h3 className="text-base font-bold text-[#1D2B1A] mt-0.5 line-clamp-1">
          {product.name}
        </h3>

        {showDescription && (
          <p className="text-xs text-[#5A6B55] mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-3 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-extrabold text-[#1E6B18]">
              {formatRupiah(product.price)}
            </span>
            {product.flash_sale_id && product.flash_sale_stock > 0 && (
              <span className="text-[11px] font-semibold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-full">
                Flash Sale {formatRupiah(product.discount_price)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onViewDetail(product)}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#236D1B] hover:bg-[#195413] text-white text-sm font-semibold transition cursor-pointer"
          >
            <span>Lihat Detail</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
