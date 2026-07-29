import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Zap, Palette, Gamepad2, ShoppingBag, User, Globe } from 'lucide-react';
import { PlaterLogo, PlaterLogoText } from '@/components/PlaterLogo';

// Rotating welcome questions - all mean the same thing, different wording
const WELCOME_QUESTIONS = [
  // Turkish
  { text: "Bugün ne inşa etmek istersiniz?", lang: 'tr' },
  { text: "Nasıl bir website hayal ediyorsunuz?", lang: 'tr' },
  { text: "Ne oluşturmak istiyorsunuz?", lang: 'tr' },
  { text: "Hangi projeye başlayalım?", lang: 'tr' },
  { text: "Bugün sizin için ne yapabilirim?", lang: 'tr' },
  { text: "Hayalinizdeki site nasıl olsun?", lang: 'tr' },
  { text: "Beraber ne yaratalım?", lang: 'tr' },
  { text: "Nereden başlıyoruz?", lang: 'tr' },
  { text: "Aklınızdaki fikir nedir?", lang: 'tr' },
  { text: "Ne tür bir website istiyorsunuz?", lang: 'tr' },
  // English  
  { text: "What would you like to build today?", lang: 'en' },
  { text: "What's your vision?", lang: 'en' },
  { text: "What can I create for you?", lang: 'en' },
  { text: "Which project shall we start?", lang: 'en' },
  { text: "What's on your mind?", lang: 'en' },
  { text: "Let's build something amazing. What is it?", lang: 'en' },
  { text: "Ready to create? What do you have in mind?", lang: 'en' },
  { text: "Tell me about your dream website", lang: 'en' },
  { text: "What kind of site do you want?", lang: 'en' },
  { text: "Where shall we begin?", lang: 'en' },
];

const QUICK_ACTIONS = [
  { icon: User, label: 'Portfolio', prompt: 'Modern bir portfolio sitesi yap: hakkımda, projeler, iletişim bölümleriyle', color: 'text-blue-400 bg-blue-500/10' },
  { icon: Gamepad2, label: 'Oyun', prompt: 'Eğlenceli bir web oyunu yap (Canvas ile)', color: 'text-purple-400 bg-purple-500/10' },
  { icon: Zap, label: 'Landing Page', prompt: 'SaaS ürünü için modern landing page yap', color: 'text-yellow-400 bg-yellow-500/10' },
  { icon: ShoppingBag, label: 'E-ticaret', prompt: 'Ürün listesi olan basit bir e-ticaret sitesi yap', color: 'text-green-400 bg-green-500/10' },
  { icon: Palette, label: 'Blog', prompt: 'Modern bir kişisel blog sitesi tasarla', color: 'text-pink-400 bg-pink-500/10' },
  { icon: Globe, label: '3D Site', prompt: 'Three.js kullanarak 3D interaktif bir website yap', color: 'text-cyan-400 bg-cyan-500/10' },
];

export const WelcomeScreen = ({ onSubmit, onSkip }) => {
  const [question, setQuestion] = useState(() => {
    const idx = Math.floor(Math.random() * WELCOME_QUESTIONS.length);
    return WELCOME_QUESTIONS[idx];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [displayText, setDisplayText] = useState('');

  // Typewriter effect for question
  useEffect(() => {
    setIsTyping(true);
    setDisplayText('');
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < question.text.length) {
        setDisplayText(question.text.substring(0, idx + 1));
        idx++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [question]);

  // Refresh question
  const newQuestion = () => {
    let next = question;
    while (next.text === question.text) {
      next = WELCOME_QUESTIONS[Math.floor(Math.random() * WELCOME_QUESTIONS.length)];
    }
    setQuestion(next);
  };

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input);
    }
  };

  const handleQuickAction = (prompt) => {
    onSubmit(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn" data-testid="welcome-screen">
      <div className="max-w-3xl w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-slideUp">
          <PlaterLogo size={72} className="mb-4" />
          <span className="text-3xl">
            <PlaterLogoText />
          </span>
          <p className="text-sm text-zinc-500 mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI-Powered Website Builder
          </p>
        </div>

        {/* Rotating Question */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100 min-h-[3rem] flex items-center justify-center flex-wrap"
            style={{ fontFamily: 'IBM Plex Sans' }}
            data-testid="welcome-question"
          >
            <span>{displayText}</span>
            {isTyping && <span className="inline-block w-0.5 h-8 bg-blue-500 ml-1 animate-blink"></span>}
          </h1>
          <button
            onClick={newQuestion}
            className="text-xs text-zinc-500 hover:text-blue-400 mt-3 transition-colors"
            data-testid="new-question-btn"
          >
            ↻ Farklı soru / Different question
          </button>
        </div>

        {/* Input */}
        <div className="relative mb-6 animate-slideUp" style={{ animationDelay: '200ms' }}>
          <textarea
            data-testid="welcome-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Fikrinizi yazın veya aşağıdan bir örnek seçin..."
            className="w-full min-h-[100px] max-h-[200px] p-4 pr-16 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-100 placeholder:text-zinc-600 resize-none text-sm"
            autoFocus
          />
          <Button
            data-testid="welcome-submit-btn"
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="absolute right-3 bottom-3 h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-30"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 animate-slideUp" style={{ animationDelay: '400ms' }}>
          <p className="text-xs uppercase tracking-widest text-zinc-500 text-center">
            veya hazır bir şablonla başlayın / or start with a template
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.prompt)}
                data-testid={`quick-action-${action.label.toLowerCase()}`}
                className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900 transition-all group text-left"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} shrink-0`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{action.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Skip button */}
        <div className="text-center mt-8 animate-slideUp" style={{ animationDelay: '600ms' }}>
          <button
            onClick={onSkip}
            data-testid="welcome-skip-btn"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Direkt build ekranına geç / Skip to builder
          </button>
        </div>
      </div>
    </div>
  );
};
