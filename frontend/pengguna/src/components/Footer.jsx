import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { SisaRasaLogo } from './Logo';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#3E8E22] via-[#2B7818] to-[#174E10] text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand & Tagline */}
          <div className="md:col-span-5 space-y-4">
            <SisaRasaLogo light size="lg" />
            <p className="text-sm text-white/90 leading-relaxed max-w-sm">
              Platform redistribusi makanan berlebih dari UMKM katering dan restoran lokal melalui
              flash sale dan voucher digital — hemat di kantong, kurangi food waste bersama.
            </p>
          </div>

          {/* Contact & Navigation */}
          <div className="md:col-span-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pb-5 border-b border-white/20">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#D4F07D]" />
                </span>
                <div className="text-xs sm:text-sm">
                  <p className="text-white/70">Telepon</p>
                  <p className="font-semibold">+62 812-3456-7890</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#D4F07D]" />
                </span>
                <div className="text-xs sm:text-sm">
                  <p className="text-white/70">Email</p>
                  <p className="font-semibold">halo@sisarasa.id</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#D4F07D] uppercase tracking-wider mb-3">
                Navigasi
              </h3>
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-white/90">
                <li>
                  <Link to="/" className="hover:text-[#D4F07D] transition">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/menu" className="hover:text-[#D4F07D] transition">
                    Menu
                  </Link>
                </li>
                <li>
                  <Link to="/flash-sale" className="hover:text-[#D4F07D] transition">
                    Flash Sale
                  </Link>
                </li>
                <li>
                  <Link to="/voucher" className="hover:text-[#D4F07D] transition">
                    Voucher
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/15 text-center text-xs text-white/80">
          © 2026 SisaRasa. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
