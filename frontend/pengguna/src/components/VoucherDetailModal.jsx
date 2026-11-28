import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Info,
  MapPin,
  Store,
  Ticket,
  X,
} from 'lucide-react';
import { formatDateTimeID, formatRupiah } from '../utils/format';

const STATUS_BADGE = {
  Aktif: 'bg-[#D4F07D] text-[#1A5314] border-[#B9E24C]',
  Digunakan: 'bg-slate-100 text-slate-700 border-slate-300',
  Kedaluwarsa: 'bg-red-50 text-red-700 border-red-200',
};

export default function VoucherDetailModal({
  voucher,
  onClose,
  onCopyCode,
  onConfirmRedeem,
  redeeming = false,
}) {
  const [copied, setCopied] = useState(false);

  if (!voucher) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.voucher_code);
      setCopied(true);
      onCopyCode?.(voucher.voucher_code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyCode?.(voucher.voucher_code);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E4F0CC] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#3E8E22] to-[#236D1B] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-[#D4F07D]" />
            <h2 className="text-lg font-bold">Detail Voucher Digital</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Product & Tenant Summary */}
          <div className="flex gap-4 items-center">
            <img
              src={voucher.image_url}
              alt={voucher.product_name}
              className="w-24 h-24 rounded-2xl object-cover bg-[#EEF7D8] border border-[#E4F0CC] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    STATUS_BADGE[voucher.status] || STATUS_BADGE.Aktif
                  }`}
                >
                  {voucher.status}
                </span>
                <span className="text-xs text-[#5A6B55] font-medium">
                  {voucher.tenant_code} - {voucher.tenant_name}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-[#1D2B1A] mt-1 truncate">
                {voucher.product_name}
              </h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xs text-[#6B7E65]">Harga dibayar di kasir:</span>
                <span className="text-lg font-extrabold text-[#DC2626]">
                  {formatRupiah(voucher.price_paid)}
                </span>
              </div>
            </div>
          </div>

          {/* Cashier-readable Unique Voucher Code */}
          <div className="rounded-2xl bg-[#F6FBE9] border-2 border-dashed border-[#65B832] p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#3F5338]">
              Kode Voucher Unik (Tunjukkan ke Kasir)
            </p>
            <p className="text-2xl sm:text-3xl font-black tracking-[0.14em] text-[#1A5314] mt-1.5 select-all font-mono">
              {voucher.voucher_code}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#CFE4A8] hover:bg-[#EDF8D3] text-xs font-bold text-[#236D1B] transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Kode Disalin!' : 'Salin Kode Voucher'}</span>
            </button>
          </div>

          {/* Timing & Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-amber-800 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Best Before Produk
              </p>
              <p className="text-amber-950 font-bold mt-1">{voucher.best_before}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F2FAE0] border border-[#DCEBBF]">
              <p className="text-[#3F5338] font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Masa Berlaku Voucher
              </p>
              <p className="text-[#1D2B1A] font-bold mt-1">
                {formatDateTimeID(voucher.expires_at)}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#236D1B] shrink-0" />
              <span>
                Lokasi Pengambilan: <strong>{voucher.tenant_name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#236D1B] shrink-0" />
              <span>{voucher.tenant_address} ({voucher.tenant_open_hours})</span>
            </div>
          </div>

          {/* Redemption Instructions */}
          <div className="rounded-2xl bg-[#F9FDF2] border border-[#E3F0CA] p-4">
            <h4 className="text-xs font-bold text-[#1A5314] uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <Info className="w-4 h-4 text-[#3E8E22]" />
              Petunjuk Penukaran Voucher
            </h4>
            <ol className="text-xs text-[#4D6346] space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Datang ke gerai <strong>{voucher.tenant_name}</strong> sebelum masa berlaku berakhir.</li>
              <li>Tunjukkan kode voucher unik di atas kepada petugas kasir.</li>
              <li>Bayar harga flash sale sebesar <strong>{formatRupiah(voucher.price_paid)}</strong> di kasir.</li>
              <li>Nikmati makanan lezat Anda dan pastikan dikonsumsi sebelum batas Best Before.</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {voucher.status === 'Aktif' && (
              <button
                type="button"
                disabled={redeeming}
                onClick={() => onConfirmRedeem(voucher.id)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#236D1B] hover:bg-[#195413] text-white text-sm font-bold transition cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{redeeming ? 'Memproses...' : 'Konfirmasi Sudah Ditukar di Kasir'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`py-2.5 px-5 rounded-xl bg-[#D4F07D] hover:bg-[#C6E865] text-[#1A5314] text-sm font-bold transition cursor-pointer ${
                voucher.status === 'Aktif' ? '' : 'w-full'
              }`}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
