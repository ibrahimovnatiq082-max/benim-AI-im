export const T2Logo = ({ size = 32, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="t2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="t2GradInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.9" />
        </linearGradient>
        <filter id="t2Glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Rounded square background with gradient */}
      <rect x="6" y="6" width="88" height="88" rx="22" fill="url(#t2Grad)" />
      
      {/* Subtle inner glow overlay */}
      <rect x="6" y="6" width="88" height="88" rx="22" fill="url(#t2Grad)" opacity="0.4" />
      
      {/* "T" letter */}
      <g filter="url(#t2Glow)">
        <rect x="20" y="26" width="36" height="7" rx="2.5" fill="url(#t2GradInner)" />
        <rect x="34" y="26" width="8" height="42" rx="2.5" fill="url(#t2GradInner)" />
      </g>
      
      {/* "2" letter - stylized */}
      <g filter="url(#t2Glow)">
        <path 
          d="M 58 32 Q 58 26 66 26 L 76 26 Q 84 26 84 34 Q 84 42 76 46 L 68 52 Q 60 58 60 66 L 60 68 L 84 68 L 84 74 L 58 74 L 58 68 Q 58 58 68 52 L 76 46 Q 80 42 80 34 Q 80 30 76 30 L 66 30 Q 62 30 62 34 L 62 36 L 58 36 Z"
          fill="url(#t2GradInner)"
        />
      </g>
      
      {/* Decorative dots */}
      <circle cx="82" cy="18" r="3" fill="#ffffff" opacity="0.8" />
      <circle cx="14" cy="82" r="2" fill="#ffffff" opacity="0.6" />
      <circle cx="88" cy="88" r="1.5" fill="#ffffff" opacity="0.5" />
    </svg>
  );
};

export const T2LogoText = ({ className = '' }) => {
  return (
    <span 
      className={className}
      style={{ 
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      T2
    </span>
  );
};

// Backward-compat exports so existing imports still work
export const PlaterLogo = T2Logo;
export const PlaterLogoText = T2LogoText;
