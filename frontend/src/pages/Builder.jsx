import { useState, useEffect } from 'react';
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
    if (!currentApiKey) {
      alert(`Please add your ${provider} API key in settings`);
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          api_key: currentApiKey,
          provider,
          model
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantMessage += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                    newMessages[newMessages.length - 1].content = assistantMessage;
                  } else {
                    newMessages.push({ role: 'assistant', content: assistantMessage });
                  }
                  return newMessages;
                });
              }
              if (data.done) {
                // Extract and set generated code
                const code = extractCode(assistantMessage);
                if (code.html || code.css || code.js) {
                  setGeneratedCode(code);
                }
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}` 
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
            <DialogContent className="bg-zinc-950 border-zinc-800 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-xl" style={{fontFamily: 'IBM Plex Sans'}}>API Settings</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Your API keys are stored locally in your browser only.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key" className="text-sm font-medium">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    data-testid="openai-key-input"
                    type="password"
                    placeholder="sk-..."
                    value={apiKeys.openai}
                    onChange={(e) => saveApiKeys({ ...apiKeys, openai: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key" className="text-sm font-medium">Anthropic API Key</Label>
                  <Input
                    id="anthropic-key"
                    data-testid="anthropic-key-input"
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKeys.anthropic}
                    onChange={(e) => saveApiKeys({ ...apiKeys, anthropic: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gemini-key" className="text-sm font-medium">Google Gemini API Key</Label>
                  <Input
                    id="gemini-key"
                    data-testid="gemini-key-input"
                    type="password"
                    placeholder="AI..."
                    value={apiKeys.gemini}
                    onChange={(e) => saveApiKeys({ ...apiKeys, gemini: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 focus:border-blue-500"
                  />
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
              <div className="h-full flex items-center justify-center text-center text-zinc-500">
                <div>
                  <p className="text-sm mb-2">Start building your website</p>
                  <p className="text-xs">Try: "Create a landing page for a SaaS product"</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message-enter ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.role === 'user' ? (
                    <div data-testid={`user-message-${idx}`} className="inline-block bg-zinc-800 rounded-lg px-4 py-2 text-sm max-w-[85%]">
                      {msg.content}
                    </div>
                  ) : (
                    <div data-testid={`ai-message-${idx}`} className="text-sm prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </div>
            )}
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
                placeholder="Describe your website..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none bg-zinc-900 border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm"
              />
              <Button
                data-testid="send-btn"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="h-[60px] w-[60px] bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Builder;
