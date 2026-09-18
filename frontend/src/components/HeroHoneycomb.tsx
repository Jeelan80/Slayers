import React from 'react';

export function HeroHoneycomb() {
  return (
    <div className="relative w-full max-w-[560px] aspect-[1.1/1] mx-auto select-none flex items-center justify-center">
      {/* Background soft wavy topographic contour circle */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-slate-50 via-white to-slate-50/50 pointer-events-none -z-10" />

      {/* Hexagon 1: Top Center - Jobs & Internship (Pastel Green) */}
      <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[190px] sm:w-[210px] aspect-[1/1.12] transition-transform hover:scale-[1.02] duration-300">
        <div
          className="w-full h-full flex flex-col items-center justify-center p-4 text-center shadow-xs"
          style={{
            backgroundColor: '#DFF3E1',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          {/* Flat stylized people illustration */}
          <div className="w-16 h-12 mb-2 flex items-center justify-center">
            <svg viewBox="0 0 64 48" fill="none" className="w-full h-full">
              <rect x="18" y="10" width="28" height="24" rx="4" fill="#58B374" fillOpacity="0.25" />
              <circle cx="32" cy="18" r="6" fill="#12805F" />
              <path d="M22 34C22 28.5 26.5 24 32 24C37.5 24 42 28.5 42 34" stroke="#12805F" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="48" cy="22" r="4" fill="#3D5A80" />
              <path d="M42 34C42 30 44.5 27 48 27C51.5 27 54 30 54 34" stroke="#3D5A80" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#14161A] tracking-tight">
            Jobs & Internship
          </span>
        </div>
      </div>

      {/* Hexagon 2: Middle Left - Hackathons (Pastel Blue) */}
      <div className="absolute top-[32%] left-[2%] w-[190px] sm:w-[210px] aspect-[1/1.12] transition-transform hover:scale-[1.02] duration-300">
        <div
          className="w-full h-full flex flex-col items-center justify-center p-4 text-center shadow-xs"
          style={{
            backgroundColor: '#D6ECF7',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          <div className="w-16 h-12 mb-2 flex items-center justify-center">
            <svg viewBox="0 0 64 48" fill="none" className="w-full h-full">
              {/* Laptop & Idea lightbulb */}
              <rect x="14" y="16" width="36" height="22" rx="3" fill="#4B90E2" fillOpacity="0.25" stroke="#2B6CB0" strokeWidth="2" />
              <path d="M10 38H54" stroke="#2B6CB0" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M26 24L22 27L26 30" stroke="#12805F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M38 24L42 27L38 30" stroke="#12805F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="46" cy="12" r="5" fill="#F15A24" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#14161A] tracking-tight">
            Hackathons
          </span>
        </div>
      </div>

      {/* Hexagon 3: Middle Right - Startup & Funding (Pastel Purple) */}
      <div className="absolute top-[32%] right-[2%] w-[190px] sm:w-[210px] aspect-[1/1.12] transition-transform hover:scale-[1.02] duration-300">
        <div
          className="w-full h-full flex flex-col items-center justify-center p-4 text-center shadow-xs"
          style={{
            backgroundColor: '#E9E2F6',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          <div className="w-16 h-12 mb-2 flex items-center justify-center">
            <svg viewBox="0 0 64 48" fill="none" className="w-full h-full">
              {/* Rocket launch / Growth bar */}
              <path d="M32 8C35 14 38 20 38 28H26C26 20 29 14 32 8Z" fill="#7C3AED" fillOpacity="0.3" stroke="#6D28D9" strokeWidth="2" />
              <path d="M26 22L20 26V30L26 28" fill="#8B5CF6" />
              <path d="M38 22L44 26V30L38 28" fill="#8B5CF6" />
              <circle cx="32" cy="18" r="2.5" fill="#14161A" />
              <path d="M28 32L32 38L36 32" stroke="#F15A24" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#14161A] tracking-tight">
            Startup & Funding
          </span>
        </div>
      </div>

      {/* Hexagon 4: Bottom Center - Learn & Upskill (Pastel Peach) */}
      <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-[190px] sm:w-[210px] aspect-[1/1.12] transition-transform hover:scale-[1.02] duration-300">
        <div
          className="w-full h-full flex flex-col items-center justify-center p-4 text-center shadow-xs"
          style={{
            backgroundColor: '#FBE6D3',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          <div className="w-16 h-12 mb-2 flex items-center justify-center">
            <svg viewBox="0 0 64 48" fill="none" className="w-full h-full">
              {/* Books stack & Certificate ribbon */}
              <path d="M16 28L32 20L48 28L32 36L16 28Z" fill="#E76F51" fillOpacity="0.3" stroke="#D9534F" strokeWidth="2" />
              <path d="M48 28V36" stroke="#D9534F" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 30V38C20 38 26 42 32 42C38 42 44 38 44 38V30" stroke="#D9534F" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#14161A] tracking-tight">
            Learn & Upskill
          </span>
        </div>
      </div>
    </div>
  );
}
