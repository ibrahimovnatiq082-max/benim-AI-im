import { useState, useEffect } from 'react';
import { Code2, Sparkles, Palette, Zap, Layers, Wand2 } from 'lucide-react';

const ROTATING_HINTS = [
  { text: "3D interaktif websiteler", icon: Layers, color: 'from-blue-500 to-cyan-500' },
  { text: "Modern portfolyolar", icon: Palette, color: 'from-purple-500 to-pink-500' },
  { text: "Web oyunları", icon: Zap, color: 'from-yellow-500 to-orange-500' },
  { text: "Landing pages", icon: Sparkles, color: 'from-green-500 to-emerald-500' },
  { text: "Dashboard'lar", icon: Code2, color: 'from-red-500 to-pink-500' },
  { text: "E-ticaret siteleri", icon: Wand2, color: 'from-indigo-500 to-purple-500' },
];

export const AnimatedEmptyPreview = () => {
  const [hintIndex, setHintIndex] = useState(0);
  const [particles] = useState(() => 
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 4,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex((i) => (i + 1) % ROTATING_HINTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentHint = ROTATING_HINTS[hintIndex];
  const HintIcon = currentHint.icon;

  return (
    <div className="relative h-full w-full overflow-hidden flex items-center justify-center" 
         style={{ background: 'radial-gradient(ellipse at center, #18181b 0%, #09090b 70%)' }}
         data-testid="animated-empty-preview">
      
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-blue-500/30 animate-float"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-8 px-6 max-w-md">
        
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring - rotating */}
          <div className="absolute w-32 h-32 rounded-full border-2 border-blue-500/20 animate-spin-slow"></div>
          <div className="absolute w-40 h-40 rounded-full border border-purple-500/10 animate-spin-reverse"></div>
          
          {/* Middle ring - pulsing */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-pulse-slow"></div>
          
          {/* Icon */}
          <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${currentHint.color} p-[2px] transition-all duration-700 shadow-lg shadow-blue-500/20`}>
            <div className="w-full h-full rounded-2xl bg-zinc-900 flex items-center justify-center">
              <HintIcon className="w-10 h-10 text-white transition-all duration-700" strokeWidth={1.5} />
            </div>
          </div>
          
          {/* Corner dots */}
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 animate-ping"></div>
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-purple-400 animate-ping" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-zinc-100 tracking-tight" style={{ fontFamily: 'IBM Plex Sans' }}>
            Websiteni oluşturalım
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Sağ taraftaki chat'e istediğinizi yazın, AI sizin için sitenizi oluştursun
          </p>
        </div>

        {/* Rotating hint */}
        <div className="pt-4">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">Neler yapabilirim?</p>
          <div className="h-8 flex items-center justify-center" data-testid="rotating-hint">
            <div 
              key={hintIndex}
              className="flex items-center gap-2 animate-slideInFade"
            >
              <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${currentHint.color}`}></div>
              <span className={`text-sm font-medium bg-gradient-to-r ${currentHint.color} bg-clip-text text-transparent`}>
                {currentHint.text}
              </span>
              <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${currentHint.color}`}></div>
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-1.5 pt-2">
          {ROTATING_HINTS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === hintIndex ? 'w-8 bg-blue-500' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-blue-500/20 rounded-tl-lg"></div>
      <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-purple-500/20 rounded-tr-lg"></div>
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-purple-500/20 rounded-bl-lg"></div>
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-blue-500/20 rounded-br-lg"></div>
    </div>
  );
};

// Loading state animation when generating
export const GeneratingPreview = () => {
  return (
    <div className="relative h-full w-full overflow-hidden flex items-center justify-center bg-zinc-950" data-testid="generating-preview">
      {/* Animated code lines */}
      <div className="absolute inset-0 opacity-20 flex flex-col justify-center gap-3 px-8">
        {[80, 60, 90, 45, 75, 55, 85, 65, 70].map((width, i) => (
          <div
            key={i}
            className="h-2 rounded-full bg-gradient-to-r from-blue-500/40 to-purple-500/40 animate-shimmer"
            style={{
              width: `${width}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center space-y-4">
        <div className="relative w-24 h-24 mx-auto">
          {/* Rotating gradient circles */}
          <div className="absolute inset-0 rounded-full bg-gradient-conic from-blue-500 via-purple-500 to-blue-500 animate-spin"></div>
          <div className="absolute inset-1 rounded-full bg-zinc-950 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
        </div>
        
        <div>
          <p className="text-lg font-medium text-zinc-100 mb-2" style={{ fontFamily: 'IBM Plex Sans' }}>
            Website oluşturuluyor
          </p>
          <div className="flex items-center justify-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
