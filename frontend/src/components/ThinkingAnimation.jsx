import { useMemo } from 'react';
import { Loader2, Sparkles, Brain, Cog, Zap, Code2, Wand2 } from 'lucide-react';

// Türkçe/İngilizce/Azerice düşünme mesajları
const THINKING_MESSAGES = [
  { text: 'Düşünüyorum...', lang: 'tr' },
  { text: 'Kod hazırlıyorum...', lang: 'tr' },
  { text: 'Analiz ediyorum...', lang: 'tr' },
  { text: 'Tasarlıyorum...', lang: 'tr' },
  { text: 'Optimize ediyorum...', lang: 'tr' },
  { text: 'Bileşenleri oluşturuyorum...', lang: 'tr' },
  { text: 'Stiller uygulanıyor...', lang: 'tr' },
  { text: 'Bir dakika, harika bir şey hazırlıyorum...', lang: 'tr' },
  { text: 'Kodu inceliyorum...', lang: 'tr' },
  { text: 'Sihir yapıyorum...', lang: 'tr' },
  { text: 'Yapıyı kuruyorum...', lang: 'tr' },
  { text: 'Fikirlerinizi hayata geçiriyorum...', lang: 'tr' },
  { text: 'Thinking...', lang: 'en' },
  { text: 'Crafting code...', lang: 'en' },
  { text: 'Analyzing your request...', lang: 'en' },
  { text: 'Designing components...', lang: 'en' },
  { text: 'Optimizing structure...', lang: 'en' },
  { text: 'Building something amazing...', lang: 'en' },
  { text: 'Weaving magic...', lang: 'en' },
  { text: 'Making it beautiful...', lang: 'en' },
];

// 8 farklı animasyon variantı
const ANIMATIONS = [
  // 1. Bouncing Dots
  {
    id: 'bouncing-dots',
    icon: Sparkles,
    render: () => (
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    )
  },
  // 2. Wave dots
  {
    id: 'wave',
    icon: Zap,
    render: () => (
      <div className="flex items-end gap-1 h-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="w-1 bg-blue-500 rounded-full animate-wave"
            style={{ animationDelay: `${i * 100}ms`, height: '100%' }}
          ></div>
        ))}
      </div>
    )
  },
  // 3. Spinner
  {
    id: 'spinner',
    icon: Loader2,
    render: () => (
      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    )
  },
  // 4. Pulse rings
  {
    id: 'pulse-rings',
    icon: Brain,
    render: () => (
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
        <div className="absolute inset-1 rounded-full bg-blue-500/50 animate-ping" style={{ animationDelay: '200ms' }}></div>
        <div className="absolute inset-2 rounded-full bg-blue-500"></div>
      </div>
    )
  },
  // 5. Rotating gear
  {
    id: 'gear',
    icon: Cog,
    render: () => (
      <Cog className="w-5 h-5 text-blue-500 animate-spin" style={{ animationDuration: '3s' }} />
    )
  },
  // 6. Bar chart
  {
    id: 'bars',
    icon: Code2,
    render: () => (
      <div className="flex items-end gap-0.5 h-5">
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i}
            className="w-1.5 bg-blue-500 rounded-sm animate-bar"
            style={{ animationDelay: `${i * 150}ms` }}
          ></div>
        ))}
      </div>
    )
  },
  // 7. Sparkle
  {
    id: 'sparkle',
    icon: Wand2,
    render: () => (
      <div className="relative w-5 h-5">
        <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
        <Sparkles className="absolute top-0 right-0 w-2 h-2 text-blue-300 animate-ping" />
      </div>
    )
  },
  // 8. Typing dots
  {
    id: 'typing',
    icon: Brain,
    render: () => (
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-typing"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-typing" style={{ animationDelay: '200ms' }}></div>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-typing" style={{ animationDelay: '400ms' }}></div>
      </div>
    )
  },
];

// Detect user language from recent message
const detectUserLanguage = (recentMessage) => {
  if (!recentMessage) return 'tr';
  const turkishChars = /[çğıöşü]/i;
  const turkishWords = /\b(bir|bir|için|yap|olsun|ne|nasıl|hangi|çok|çok|sitesi|website|websiteni)\b/i;
  if (turkishChars.test(recentMessage) || turkishWords.test(recentMessage)) return 'tr';
  return 'en';
};

export const ThinkingAnimation = ({ userMessage }) => {
  const { animation, message } = useMemo(() => {
    const lang = detectUserLanguage(userMessage);
    const messages = THINKING_MESSAGES.filter(m => m.lang === lang);
    const messageIdx = Math.floor(Math.random() * messages.length);
    const animIdx = Math.floor(Math.random() * ANIMATIONS.length);
    return {
      animation: ANIMATIONS[animIdx],
      message: messages[messageIdx].text
    };
  }, [userMessage]);

  const IconComponent = animation.icon;

  return (
    <div className="message-enter" data-testid="thinking-animation">
      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-zinc-800/40 to-zinc-800/20 rounded-lg border border-blue-500/20 shadow-lg shadow-blue-500/5">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-500/30 shrink-0 animate-pulse">
          <IconComponent className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 pt-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent" data-testid="thinking-message">
              {message}
            </span>
          </div>
          <div data-testid={`animation-${animation.id}`}>
            {animation.render()}
          </div>
        </div>
      </div>
    </div>
  );
};
