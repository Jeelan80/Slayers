import React from 'react';

interface HackinglyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function HackinglyLogo({ className = '', size = 'md', showText = true }: HackinglyLogoProps) {
  const iconDimensions = {
    sm: { w: 24, h: 24, fontSize: 'text-lg' },
    md: { w: 32, h: 32, fontSize: 'text-2xl' },
    lg: { w: 44, h: 44, fontSize: 'text-3xl' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Orange Diamond with <> inside */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#F15A24] to-[#E04B18] shadow-sm flex-shrink-0"
        style={{ width: iconDimensions.w, height: iconDimensions.h }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3/5 h-3/5"
        >
          {/* < and > code glyphs */}
          <polyline points="8 9 5 12 8 15" />
          <polyline points="16 9 19 12 16 15" />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-extrabold tracking-tight text-[#F15A24] ${iconDimensions.fontSize}`}
          style={{ fontFamily: 'var(--font-poppins), sans-serif' }}
        >
          hackingly
        </span>
      )}
    </div>
  );
}
