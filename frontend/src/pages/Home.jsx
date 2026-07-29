import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Code2, Zap, Globe, Mic, Figma } from 'lucide-react';
import { PlaterLogo, PlaterLogoText } from '@/components/PlaterLogo';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlaterLogo size={36} />
            <span className="text-2xl tracking-tight">
              <PlaterLogoText />
            </span>
          </div>
          <Button
            data-testid="get-started-btn"
            onClick={() => navigate('/builder')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400">
            <Sparkles className="w-4 h-4" />
            AI-Powered Website Builder
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight" style={{fontFamily: 'IBM Plex Sans'}}>
            Build Anything with
            <span className="block mt-2">
              <PlaterLogoText />
            </span>
          </h1>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Sesli konuşma, otomatik dil algılama, 3D oyunlar, portfolyolar ve daha fazlası. Kendi API anahtarlarınızı kullanın, Figma'ya aktarın, tek tıkla yayınlayın.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              data-testid="hero-get-started-btn"
              size="lg"
              onClick={() => navigate('/builder')}
              className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8"
            >
              Start Building
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
            <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-base font-medium mb-2" style={{fontFamily: 'IBM Plex Sans'}}>Hızlı</h3>
              <p className="text-xs text-zinc-400">Saniyeler içinde website oluştur</p>
            </div>
            
            <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-purple-600/10 flex items-center justify-center mb-4 mx-auto">
                <Mic className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-base font-medium mb-2" style={{fontFamily: 'IBM Plex Sans'}}>Sesli</h3>
              <p className="text-xs text-zinc-400">Konuşarak website tarif et</p>
            </div>
            
            <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-pink-600/10 flex items-center justify-center mb-4 mx-auto">
                <Figma className="w-6 h-6 text-pink-500" />
              </div>
              <h3 className="text-base font-medium mb-2" style={{fontFamily: 'IBM Plex Sans'}}>Figma</h3>
              <p className="text-xs text-zinc-400">Figma'da aç ve düzenle</p>
            </div>
            
            <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-green-600/10 flex items-center justify-center mb-4 mx-auto">
                <Globe className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-base font-medium mb-2" style={{fontFamily: 'IBM Plex Sans'}}>Yayınla</h3>
              <p className="text-xs text-zinc-400">Tek tıkla siteni paylaş</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-zinc-500">
          Plater AI • Kendi anahtarınız, kendi kontrolünüz
        </div>
      </footer>
    </div>
  );
};

export default Home;
