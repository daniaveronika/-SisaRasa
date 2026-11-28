import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SisaRasaLogo } from './Logo';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/flash-sale', label: 'Flash Sale' },
  { to: '/voucher', label: 'Voucher' },
];

export default function Navbar() {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }) =>
    `px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-[#D4F07D] text-[#1A5314] shadow-xs'
        : 'text-[#2D3E28] hover:bg-[#EDF8D3] hover:text-[#1E6B18]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E3F0CA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link to="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
          <SisaRasaLogo size="md" />
        </Link>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2" aria-label="Navigasi Utama">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Login / Profile */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/profil')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F2FAE0] hover:bg-[#E4F4C4] text-[#1A5314] text-sm font-semibold transition cursor-pointer"
                title="Profil Konsumen"
              >
                <span className="w-6 h-6 rounded-full bg-[#236D1B] text-white flex items-center justify-center text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span className="max-w-[120px] truncate">{user.name}</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-full text-[#4D6346] hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#236D1B] hover:bg-[#1B5714] text-white text-sm font-semibold transition shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk</span>
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-xl text-[#236D1B] hover:bg-[#EDF8D3] transition cursor-pointer"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E3F0CA] bg-white px-4 py-4 space-y-2">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-xl text-sm font-semibold ${
                    isActive ? 'bg-[#D4F07D] text-[#1A5314]' : 'text-[#2D3E28] hover:bg-[#F2FAE0]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E3F0CA] flex items-center justify-between">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profil"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A5314]"
                >
                  <User className="w-4 h-4" />
                  <span>{user.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openAuthModal('login');
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#236D1B] text-white text-sm font-semibold"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Daftar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
