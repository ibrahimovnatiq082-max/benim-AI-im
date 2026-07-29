import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Send, Download, Monitor, Tablet, Smartphone, Code2, Loader2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MODELS = {
  openai: [
    { value: 'gpt-5.4', label: 'GPT-5.4' },
    { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
    { value: 'gpt-5.2', label: 'GPT-5.2' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
  ],
  gemini: [
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  ],
};

const Builder = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-5.4');
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [activeTab, setActiveTab] = useState('preview');
  const [copiedCode, setCopiedCode] = useState(null);
  const chatEndRef = useRef(null);
  
  // API Keys from localStorage
  const [apiKeys, setApiKeys] = useState(() => {
    const stored = localStorage.getItem('ai_builder_keys');
    return stored ? JSON.parse(stored) : {
      openai: '',
      anthropic: '',
      gemini: '',
    };
  });
  
  // Generated code
  const [generatedCode, setGeneratedCode] = useState({
    html: '',
    css: '',
    js: ''
  });

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Save API keys to localStorage
  const saveApiKeys = (keys) => {
    setApiKeys(keys);
    localStorage.setItem('ai_builder_keys', JSON.stringify(keys));
  };

  // Extract code from AI response
  const extractCode = (text) => {
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
    const cssMatch = text.match(/```css\n([\s\S]*?)```/);
    const jsMatch = text.match(/```(?:javascript|js)\n([\s\S]*?)```/);

    return {
      html: htmlMatch ? htmlMatch[1].trim() : generatedCode.html,
      css: cssMatch ? cssMatch[1].trim() : generatedCode.css,
      js: jsMatch ? jsMatch[1].trim() : generatedCode.js
    };
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const currentApiKey = apiKeys[provider];
    if (!currentApiKey || currentApiKey.trim() === '') {
      alert(`Lütfen önce ayarlardan ${provider.toUpperCase()} API anahtarınızı girin.\n\nPlease add your ${provider.toUpperCase()} API key in settings first.`);
      return;
    }

    const userMessage = { role: 'user', content: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages,
          api_key: currentApiKey,
          provider,
          model
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let messageIndex = -1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                // API key hatası veya diğer hatalar
                let errorMsg = data.error;
                if (errorMsg.includes('Incorrect API key') || errorMsg.includes('invalid_api_key')) {
                  errorMsg = `❌ API anahtarı geçersiz! Lütfen ayarlardan doğru API anahtarını girin.\n\n❌ Invalid API key! Please enter the correct API key in settings.\n\nHata: ${errorMsg}`;
                } else if (errorMsg.includes('insufficient_quota') || errorMsg.includes('exceeded')) {
                  errorMsg = `❌ API kotanız dolmuş! Lütfen hesabınıza kredi ekleyin.\n\n❌ API quota exceeded! Please add credits to your account.\n\nHata: ${errorMsg}`;
                } else {
                  errorMsg = `❌ Hata / Error:\n${errorMsg}`;
                }
                setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
                setIsLoading(false);
                return;
              }
              
              if (data.content) {
                assistantMessage += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  if (messageIndex === -1) {
                    // İlk token - yeni mesaj ekle
                    newMessages.push({ role: 'assistant', content: assistantMessage });
                    messageIndex = newMessages.length - 1;
                  } else {
                    // Mevcut mesajı güncelle
                    newMessages[messageIndex] = { role: 'assistant', content: assistantMessage };
                  }
                  return newMessages;
                });
              }
              
              if (data.done) {
                // Kodu çıkar ve kaydet
                const code = extractCode(assistantMessage);
                if (code.html || code.css || code.js) {
                  setGeneratedCode(prevCode => ({
                    html: code.html || prevCode.html,
                    css: code.css || prevCode.css,
                    js: code.js || prevCode.js
                  }));
                }
              }
            } catch (e) {
              console.error('Parse error:', e, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      let errorMsg = `❌ Bağlantı hatası / Connection error:\n${error.message}`;
      if (error.message.includes('Failed to fetch')) {
        errorMsg = `❌ Sunucuya bağlanılamadı! İnternet bağlantınızı kontrol edin.\n\n❌ Cannot connect to server! Check your internet connection.`;
      }
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMsg
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate preview HTML
  const getPreviewHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
        <style>
          ${generatedCode.css}
        </style>
      </head>
      <body>
        ${generatedCode.html}
        <script>
          ${generatedCode.js}
        </script>
      </body>
      </html>
    `;
  };

  // Export as ZIP
  const exportAsZip = async () => {
    const zip = new JSZip();
    zip.file('index.html', generatedCode.html || '<!DOCTYPE html><html><head><title>Generated Site</title></head><body><h1>No content yet</h1></body></html>');
    zip.file('styles.css', generatedCode.css || '/* No styles yet */');
    zip.file('script.js', generatedCode.js || '// No JavaScript yet');
    
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'website.zip');
  };

  // Export individual file
  const exportFile = (filename, content) => {
    const blob = new Blob([content || ''], { type: 'text/plain' });
    saveAs(blob, filename);
  };

  // Copy code to clipboard
  const copyCode = (code, type) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Highlight code when switching tabs
  useEffect(() => {
    Prism.highlightAll();
  }, [activeTab, generatedCode]);

  const deviceWidths = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]'
  };

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-semibold tracking-tight" style={{fontFamily: 'IBM Plex Sans'}}>AI Builder</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <Select value={provider} onValueChange={(val) => {
              setProvider(val);
              setModel(MODELS[val][0].value);
            }}>
              <SelectTrigger data-testid="provider-selector" className="w-[140px] h-9 bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>

            <Select value={model} onValueChange={setModel}>
              <SelectTrigger data-testid="model-selector" className="w-[180px] h-9 bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS[provider].map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Settings Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="settings-btn" variant="outline" size="icon" className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 backdrop-blur-xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl" style={{fontFamily: 'IBM Plex Sans'}}>API Ayarları / API Settings</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  API anahtarlarınız yalnızca tarayıcınızda saklanır, asla sunucuya kaydedilmez.
                  <br />
                  Your API keys are stored only in your browser, never on the server.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key" className="text-sm font-medium flex items-center justify-between">
                    <span>OpenAI API Key</span>
                    {apiKeys.openai && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Kaydedildi
                      </span>
                    )}
                  </Label>
                  <Input
                    id="openai-key"
                    data-testid="openai-key-input"
                    type="password"
                    placeholder="sk-..."
                    value={apiKeys.openai}
                    onChange={(e) => saveApiKeys({ ...apiKeys, openai: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 focus:border-blue-500 font-mono text-xs"
                  />
                  <p className="text-xs text-zinc-500">
                    Almak için: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">platform.openai.com/api-keys</a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key" className="text-sm font-medium flex items-center justify-between">
                    <span>Anthropic API Key</span>
                    {apiKeys.anthropic && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Kaydedildi
                      </span>
                    )}
                  </Label>
                  <Input
                    id="anthropic-key"
                    data-testid="anthropic-key-input"
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKeys.anthropic}
                    onChange={(e) => saveApiKeys({ ...apiKeys, anthropic: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 focus:border-blue-500 font-mono text-xs"
                  />
                  <p className="text-xs text-zinc-500">
                    Almak için: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">console.anthropic.com</a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gemini-key" className="text-sm font-medium flex items-center justify-between">
                    <span>Google Gemini API Key</span>
                    {apiKeys.gemini && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Kaydedildi
                      </span>
                    )}
                  </Label>
                  <Input
                    id="gemini-key"
                    data-testid="gemini-key-input"
                    type="password"
                    placeholder="AI..."
                    value={apiKeys.gemini}
                    onChange={(e) => saveApiKeys({ ...apiKeys, gemini: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 focus:border-blue-500 font-mono text-xs"
                  />
                  <p className="text-xs text-zinc-500">
                    Almak için: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">makersuite.google.com/app/apikey</a>
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex items-start gap-2 text-xs text-zinc-500">
                    <div className="w-4 h-4 rounded bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-blue-500 text-[10px]">ℹ</span>
                    </div>
                    <p>
                      API anahtarınızı girdikten sonra provider ve model seçin, ardından chat'e bir şeyler yazarak test edin.
                      <br />
                      After entering your API key, select provider and model, then test by chatting.
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Preview/Code */}
        <div className="flex-1 flex flex-col border-r border-zinc-800 bg-zinc-950 relative overflow-hidden">
          {/* Preview Header */}
          <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="bg-transparent h-auto p-0 gap-1">
                <TabsTrigger 
                  data-testid="preview-tab"
                  value="preview" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider"
                >
                  Preview
                </TabsTrigger>
                <TabsTrigger 
                  data-testid="html-tab"
                  value="html" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider"
                >
                  HTML
                </TabsTrigger>
                <TabsTrigger 
                  data-testid="css-tab"
                  value="css" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider"
                >
                  CSS
                </TabsTrigger>
                <TabsTrigger 
                  data-testid="js-tab"
                  value="js" 
                  className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider"
                >
                  JavaScript
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (
                <>
                  <Button
                    data-testid="device-desktop"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeviceMode('desktop')}
                    className={`h-8 w-8 ${deviceMode === 'desktop' ? 'bg-zinc-800' : ''}`}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid="device-tablet"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeviceMode('tablet')}
                    className={`h-8 w-8 ${deviceMode === 'tablet' ? 'bg-zinc-800' : ''}`}
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid="device-mobile"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeviceMode('mobile')}
                    className={`h-8 w-8 ${deviceMode === 'mobile' ? 'bg-zinc-800' : ''}`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              <Button
                data-testid="export-zip-btn"
                variant="outline"
                size="sm"
                onClick={exportAsZip}
                className="h-8 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                ZIP
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-zinc-950">
            <Tabs value={activeTab} className="h-full">
              <TabsContent value="preview" className="h-full m-0 p-4 data-[state=active]:flex items-start justify-center">
                <div className={`${deviceWidths[deviceMode]} h-full bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300`}>
                  {generatedCode.html ? (
                    <iframe
                      data-testid="preview-iframe"
                      srcDoc={getPreviewHTML()}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts"
                      title="Preview"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500 bg-zinc-900">
                      <div className="text-center">
                        <Code2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No website generated yet</p>
                        <p className="text-xs mt-1">Start chatting to create your website</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="html" className="h-full m-0 p-4 overflow-auto">
                <div className="relative">
                  <Button
                    data-testid="copy-html-btn"
                    size="sm"
                    onClick={() => copyCode(generatedCode.html, 'html')}
                    className="absolute top-2 right-2 z-10 h-8 bg-zinc-800 hover:bg-zinc-700"
                  >
                    {copiedCode === 'html' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="language-html"><code className="language-html">{generatedCode.html || '<!-- No HTML yet -->'}</code></pre>
                </div>
              </TabsContent>

              <TabsContent value="css" className="h-full m-0 p-4 overflow-auto">
                <div className="relative">
                  <Button
                    data-testid="copy-css-btn"
                    size="sm"
                    onClick={() => copyCode(generatedCode.css, 'css')}
                    className="absolute top-2 right-2 z-10 h-8 bg-zinc-800 hover:bg-zinc-700"
                  >
                    {copiedCode === 'css' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="language-css"><code className="language-css">{generatedCode.css || '/* No CSS yet */'}</code></pre>
                </div>
              </TabsContent>

              <TabsContent value="js" className="h-full m-0 p-4 overflow-auto">
                <div className="relative">
                  <Button
                    data-testid="copy-js-btn"
                    size="sm"
                    onClick={() => copyCode(generatedCode.js, 'js')}
                    className="absolute top-2 right-2 z-10 h-8 bg-zinc-800 hover:bg-zinc-700"
                  >
                    {copiedCode === 'js' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="language-javascript"><code className="language-javascript">{generatedCode.js || '// No JavaScript yet'}</code></pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="w-[400px] shrink-0 flex flex-col bg-zinc-900/30">
          {/* Chat Messages */}
          <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-zinc-500 px-6">
                <div className="max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Code2 className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-base font-medium text-zinc-300 mb-2">Websiteni oluşturmaya başla</h3>
                  <p className="text-sm text-zinc-500 mb-4">AI ile kolayca website oluştur. Örnek komutlar:</p>
                  <div className="space-y-2 text-xs text-left bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                    <p className="text-zinc-400">• "Bir SaaS ürünü için landing page yap"</p>
                    <p className="text-zinc-400">• "Fotoğrafçı için modern portfolio sitesi"</p>
                    <p className="text-zinc-400">• "Blog sayfası yap sidebar ile"</p>
                    <p className="text-zinc-400">• "Restoran menü sayfası oluştur"</p>
                  </div>
                  <p className="text-xs text-zinc-600 mt-4">⚠️ Önce ayarlardan API anahtarınızı ekleyin</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message-enter ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  {msg.role === 'user' ? (
                    <div data-testid={`user-message-${idx}`} className="inline-block bg-blue-600 rounded-lg px-4 py-2.5 text-sm max-w-[85%] shadow-lg">
                      <p className="text-white whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  ) : (
                    <div data-testid={`ai-message-${idx}`} className="w-full">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 shrink-0 mt-1">
                          <Code2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 text-sm text-zinc-100 prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-code:text-blue-400">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({node, inline, className, children, ...props}) {
                                return inline ? (
                                  <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-blue-400 text-xs font-mono" {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="message-enter">
                <div className="flex items-start gap-3 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 shrink-0">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-zinc-200">AI düşünüyor / AI is thinking</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
            <div className="flex gap-2">
              <Textarea
                data-testid="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Website'nizi tarif edin... (Örn: Bir SaaS ürünü için landing page yap)"
                className="flex-1 min-h-[60px] max-h-[120px] resize-none bg-zinc-900 border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm"
              />
              <Button
                data-testid="send-btn"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="h-[60px] w-[60px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Builder;
