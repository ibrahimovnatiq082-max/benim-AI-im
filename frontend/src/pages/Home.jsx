import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Code2, Zap, Globe } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-semibold tracking-tight" style={{fontFamily: 'IBM Plex Sans'}}>AI Builder</span>
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
            Build Websites with
            <span className="block text-blue-500 mt-2">Artificial Intelligence</span>
          </h1>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Use your own API keys to generate websites instantly. Support for OpenAI, Claude, Gemini, and more. Create, preview, and export in seconds.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{fontFamily: 'IBM Plex Sans'}}>Lightning Fast</h3>
              <p className="text-sm text-zinc-400">Generate complete websites in seconds with AI-powered code generation</p>
            </div>
            
            <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4 mx-auto">
                <Globe className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{fontFamily: 'IBM Plex Sans'}}>Live Preview</h3>
              <p className="text-sm text-zinc-400">See your website come to life in real-time with instant preview</p>
            </div>
            
            <div className="p-6 rounded-lg bg-zinc-900/30 border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4 mx-auto">
                <Code2 className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium mb-2" style={{fontFamily: 'IBM Plex Sans'}}>Export Anywhere</h3>
              <p className="text-sm text-zinc-400">Download your project as ZIP or individual files</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-zinc-500">
          Built with AI • Your keys, your data, your control
        </div>
      </footer>
    </div>
  );
};

export default Home;
