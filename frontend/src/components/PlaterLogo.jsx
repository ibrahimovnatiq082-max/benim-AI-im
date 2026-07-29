export const PlaterLogo = ({ size = 32, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background gradient */}
      <defs>
        <linearGradient id="platerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="platerGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      
      {/* Outer rounded square */}
      <rect x="8" y="8" width="84" height="84" rx="20" fill="url(#platerGrad)" />
      
      {/* Inner elements - stylized "P" as plate/canvas */}
      <rect x="22" y="22" width="56" height="8" rx="3" fill="#fff" opacity="0.9" />
      <rect x="22" y="34" width="40" height="8" rx="3" fill="#fff" opacity="0.7" />
      <rect x="22" y="46" width="48" height="8" rx="3" fill="#fff" opacity="0.85" />
      <rect x="22" y="58" width="32" height="8" rx="3" fill="#fff" opacity="0.6" />
      <rect x="22" y="70" width="44" height="8" rx="3" fill="#fff" opacity="0.75" />
      
      {/* Accent dots (like AI nodes) */}
      <circle cx="80" cy="26" r="4" fill="#fff" />
      <circle cx="66" cy="38" r="3" fill="#fff" opacity="0.7" />
      <circle cx="74" cy="50" r="3.5" fill="#fff" opacity="0.85" />
    </svg>
  );
};

export const PlaterLogoText = ({ className = '' }) => {
  return (
    <span 
      className={className}
      style={{ 
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      Plater AI
    </span>
  );
};
