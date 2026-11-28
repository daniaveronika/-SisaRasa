export function SisaRasaLogo({ light = false, size = 'md' }) {
  const iconSize = size === 'lg' ? 44 : size === 'sm' ? 28 : 36;
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Circular eco arrows */}
        <path
          d="M14 26C16.5 16 25.5 9 36 10.5C42 11.4 47 14.8 50 19.5"
          stroke={light ? '#D8F582' : '#7BC142'}
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M51 12L51.5 21.5L42 20"
          stroke={light ? '#D8F582' : '#7BC142'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M50 38C47.5 48 38.5 55 28 53.5C22 52.6 17 49.2 14 44.5"
          stroke={light ? '#B5EC5A' : '#3E8E22'}
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M13 52L12.5 42.5L22 44"
          stroke={light ? '#B5EC5A' : '#3E8E22'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Fresh produce inside bowl */}
        <circle cx="24" cy="28" r="5.5" fill="#F97316" />
        <circle cx="33" cy="25" r="6" fill="#22C55E" />
        <circle cx="41" cy="29" r="5" fill="#EF4444" />
        <path d="M27 23C29 19 34 19 36 23" fill="#84CC16" />
        {/* Green bowl */}
        <path
          d="M16 32H48C48 41 41 47 32 47C23 47 16 41 16 32Z"
          fill={light ? '#FFFFFF' : '#2B7A1E'}
        />
        {/* Heart inside bowl */}
        <path
          d="M32 42.5C32 42.5 27.5 39.6 27.5 36.8C27.5 35.4 28.6 34.4 29.9 34.4C30.8 34.4 31.6 34.9 32 35.6C32.4 34.9 33.2 34.4 34.1 34.4C35.4 34.4 36.5 35.4 36.5 36.8C36.5 39.6 32 42.5 32 42.5Z"
          fill={light ? '#2B7A1E' : '#FFFFFF'}
        />
      </svg>
      <div className="leading-none">
        <span
          className={`block font-extrabold tracking-tight ${
            size === 'lg' ? 'text-xl' : 'text-lg'
          } ${light ? 'text-white' : 'text-[#236D1B]'}`}
        >
          Sisa<span className={light ? 'text-[#D4F07D]' : 'text-[#4EA82A]'}>Rasa</span>
        </span>
      </div>
    </div>
  );
}

export function HeroEcoBadge() {
  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 mx-auto">
      {/* Soft glowing halo */}
      <div className="absolute inset-4 rounded-full bg-[#D9F48E]/60 blur-2xl" />
      <svg
        viewBox="0 0 280 280"
        className="relative w-full h-full drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer eco recycling arrows */}
        <path
          d="M52 122C60 72 104 38 156 44C185 48 210 64 225 88"
          stroke="#65B832"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M231 58L233 96L196 88"
          stroke="#65B832"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M228 158C220 208 176 242 124 236C95 232 70 216 55 192"
          stroke="#236D1B"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M49 222L47 184L84 192"
          stroke="#236D1B"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Sparkle stars */}
        <path d="M236 116L239 124L247 127L239 130L236 138L233 130L225 127L233 124Z" fill="#7BC142" />
        <path d="M52 72L54 78L60 80L54 82L52 88L50 82L44 80L50 78Z" fill="#7BC142" />
        <circle cx="212" cy="196" r="4" fill="#84CC16" />

        {/* Fresh surplus food & produce inside bowl */}
        <circle cx="102" cy="126" r="24" fill="#FB923C" />
        <circle cx="102" cy="126" r="18" fill="#FDBA74" />
        <circle cx="142" cy="112" r="26" fill="#22C55E" />
        <circle cx="176" cy="126" r="22" fill="#EF4444" />
        <circle cx="156" cy="134" r="18" fill="#A3E635" />
        <ellipse cx="124" cy="136" rx="20" ry="14" fill="#FACC15" />

        {/* Bowl rim & body */}
        <rect x="68" y="138" width="144" height="14" rx="7" fill="#3E8E22" />
        <path
          d="M74 148H206C206 189 176 218 140 218C104 218 74 189 74 148Z"
          fill="#236D1B"
        />
        <path
          d="M84 156C88 184 110 204 136 208"
          stroke="#4EA82A"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* White heart symbol */}
        <path
          d="M140 198C140 198 119 184.5 119 172C119 165.4 124.2 160.5 130.5 160.5C134.6 160.5 138.2 162.7 140 166C141.8 162.7 145.4 160.5 149.5 160.5C155.8 160.5 161 165.4 161 172C161 184.5 140 198 140 198Z"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
}
