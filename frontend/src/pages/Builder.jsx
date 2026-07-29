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
import { Settings, Send, Download, Monitor, Tablet, Smartphone, Code2, Loader2, Copy, Check, Rocket, AlertCircle, Image as ImageIcon, Video, RefreshCw, Trash2, Plus, History, X, FileCode, Mic, MicOff, Figma, Sun, Moon } from 'lucide-react';
import { PlaterLogo, PlaterLogoText } from '@/components/PlaterLogo';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ThinkingAnimation } from '@/components/ThinkingAnimation';
import { toast } from 'sonner';
import { useAppTheme } from '@/App';
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
    { value: 'gpt-4o', label: 'GPT-4o' },
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

// Load code from localStorage
const loadCode = () => {
  try {
    const stored = localStorage.getItem('ai_builder_code');
    return stored ? JSON.parse(stored) : { html: '', css: '', js: '' };
  } catch {
    return { html: '', css: '', js: '' };
  }
};

// Load messages from localStorage
const loadMessages = () => {
  try {
    const stored = localStorage.getItem('ai_builder_messages');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Load projects history from localStorage
const loadProjects = () => {
  try {
    const stored = localStorage.getItem('ai_builder_projects');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Load current project ID
const loadCurrentProjectId = () => {
  return localStorage.getItem('ai_builder_current_project') || null;
};

// Auto-detect project name from first message
const generateProjectName = (messages) => {
  if (!messages || messages.length === 0) return 'Yeni Proje';
  const firstMsg = messages.find(m => m.role === 'user');
  if (!firstMsg) return 'Yeni Proje';
  const content = firstMsg.content.split('\n')[0].substring(0, 50);
  return content || 'Yeni Proje';
};

const Builder = () => {
  const { theme, toggleTheme } = useAppTheme();
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-5.4');
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [activeTab, setActiveTab] = useState('preview');
  const [copiedCode, setCopiedCode] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [publishStatus, setPublishStatus] = useState(null);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [projects, setProjects] = useState(loadProjects);
  const [currentProjectId, setCurrentProjectId] = useState(loadCurrentProjectId);
  const [showProjectHistory, setShowProjectHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    const stored = localStorage.getItem('ai_builder_messages');
    const hasMessages = stored && JSON.parse(stored).length > 0;
    return !hasMessages;
  });
  const [welcomeTransitioning, setWelcomeTransitioning] = useState(false);
  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const [apiKeys, setApiKeys] = useState(() => {
    const stored = localStorage.getItem('ai_builder_keys');
    return stored ? JSON.parse(stored) : { openai: '', anthropic: '', gemini: '' };
  });

  const [generatedCode, setGeneratedCode] = useState(loadCode);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('ai_builder_code', JSON.stringify(generatedCode));
  }, [generatedCode]);

  useEffect(() => {
    localStorage.setItem('ai_builder_messages', JSON.stringify(messages));
  }, [messages]);

  // Auto-save current project to projects history
  useEffect(() => {
    const hasContent = messages.length > 0 || generatedCode.html || generatedCode.css || generatedCode.js;
    if (!hasContent) return;

    const projectId = currentProjectId || `project-${Date.now()}`;
    if (!currentProjectId) {
      setCurrentProjectId(projectId);
      localStorage.setItem('ai_builder_current_project', projectId);
    }

    const updatedProject = {
      id: projectId,
      name: generateProjectName(messages),
      messages,
      code: generatedCode,
      updatedAt: new Date().toISOString(),
      createdAt: projects.find(p => p.id === projectId)?.createdAt || new Date().toISOString()
    };

    setProjects(prev => {
      const existing = prev.findIndex(p => p.id === projectId);
      let updated;
      if (existing >= 0) {
        updated = [...prev];
        updated[existing] = updatedProject;
      } else {
        updated = [updatedProject, ...prev];
      }
      // Keep max 20 projects
      updated = updated.slice(0, 20);
      localStorage.setItem('ai_builder_projects', JSON.stringify(updated));
      return updated;
    });
  }, [messages, generatedCode]);

  // Load a project from history
  const loadProject = (project) => {
    setMessages(project.messages || []);
    setGeneratedCode(project.code || { html: '', css: '', js: '' });
    setCurrentProjectId(project.id);
    localStorage.setItem('ai_builder_current_project', project.id);
    setShowProjectHistory(false);
    setActiveTab('preview');
    setPreviewKey(k => k + 1);
  };

  // Delete a project from history
  const deleteProject = (projectId, e) => {
    e.stopPropagation();
    if (!window.confirm('Bu projeyi silmek istediğinizden emin misiniz?')) return;
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      localStorage.setItem('ai_builder_projects', JSON.stringify(updated));
      return updated;
    });
    if (currentProjectId === projectId) {
      setMessages([]);
      setGeneratedCode({ html: '', css: '', js: '' });
      setCurrentProjectId(null);
      localStorage.removeItem('ai_builder_current_project');
    }
  };

  // Create new project
  const newProject = () => {
    if (messages.length > 0 || generatedCode.html) {
      if (!window.confirm('Mevcut projeyi bırakıp yeni proje başlatmak istediğinizden emin misiniz? (Mevcut proje kaydedildi)')) return;
    }
    setMessages([]);
    setGeneratedCode({ html: '', css: '', js: '' });
    setCurrentProjectId(null);
    localStorage.removeItem('ai_builder_current_project');
    localStorage.removeItem('ai_builder_messages');
    localStorage.removeItem('ai_builder_code');
    setShowProjectHistory(false);
    setActiveTab('preview');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveApiKeys = (keys) => {
    setApiKeys(keys);
    localStorage.setItem('ai_builder_keys', JSON.stringify(keys));
  };

  // Extract code from AI response (supports large projects)
  const extractCode = (text) => {
    // Match all code blocks - support multiple blocks per language
    const htmlMatches = [...text.matchAll(/```html\s*\n([\s\S]*?)```/g)];
    const cssMatches = [...text.matchAll(/```css\s*\n([\s\S]*?)```/g)];
    const jsMatches = [...text.matchAll(/```(?:javascript|js)\s*\n([\s\S]*?)```/g)];

    // Combine all matches (for large projects with multiple code blocks)
    const html = htmlMatches.map(m => m[1].trim()).join('\n\n');
    const css = cssMatches.map(m => m[1].trim()).join('\n\n');
    const js = jsMatches.map(m => m[1].trim()).join('\n\n');

    return { html, css, js };
  };

  // Extract natural language explanation (removing code blocks)
  const extractExplanation = (text) => {
    return text
      .replace(/```html\s*\n[\s\S]*?```/g, '')
      .replace(/```css\s*\n[\s\S]*?```/g, '')
      .replace(/```(?:javascript|js)\s*\n[\s\S]*?```/g, '')
      .replace(/```[\s\S]*?```/g, '') // Remove other code blocks too
      .trim();
  };

  // Validate generated code
  const validateCode = async (code) => {
    try {
      const response = await fetch(`${API}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(code)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentApiKey = apiKeys[provider];
    if (!currentApiKey || currentApiKey.trim() === '') {
      toast.error('API anahtarı eksik', {
        description: `Ayarlardan ${provider.toUpperCase()} API anahtarınızı ekleyin`,
        duration: 4000,
      });
      return;
    }

    const userMessage = { role: 'user', content: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);
    setValidationStatus(null);
    setPublishStatus(null);

    // Provide context about existing code (in user's language automatically)
    const hasCode = generatedCode.html || generatedCode.css || generatedCode.js;
    const contextInfo = hasCode 
      ? `\n\n[CONTEXT: User has existing code (HTML: ${generatedCode.html.length} chars, CSS: ${generatedCode.css.length} chars, JS: ${generatedCode.js.length} chars). Update/modify it based on this request. Respond in the same language as the user's message. Provide code in separate \`\`\`html, \`\`\`css, \`\`\`javascript blocks.]`
      : `\n\n[CONTEXT: Fresh start. Create complete, error-free code. Respond in the same language as the user's message. Provide code in separate \`\`\`html, \`\`\`css, \`\`\`javascript blocks.]`;
    
    const contextMessage = {
      role: 'user',
      content: input + contextInfo
    };

    const messagesToSend = [...messages, contextMessage];

    // Setup abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          api_key: currentApiKey,
          provider,
          model
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let messageIndex = -1;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              let shortError = 'Bilinmeyen hata';
              let description = '';
              
              if (data.error.includes('Incorrect API key') || data.error.includes('invalid_api_key') || data.error.includes('Invalid API')) {
                shortError = 'API Anahtarı Geçersiz';
                description = `${provider.toUpperCase()} anahtarınızı kontrol edin`;
              } else if (data.error.includes('insufficient_quota') || data.error.includes('exceeded') || data.error.includes('quota')) {
                shortError = 'API Kotası Dolmuş';
                description = 'Hesabınıza kredi ekleyin veya başka provider deneyin';
              } else if (data.error.includes('rate_limit') || data.error.includes('rate limit')) {
                shortError = 'Çok Fazla İstek';
                description = 'Biraz bekleyip tekrar deneyin';
              } else if (data.error.includes('model_not_found') || data.error.includes('does not exist')) {
                shortError = 'Model Bulunamadı';
                description = 'Farklı bir model seçin';
              } else if (data.error.includes('overloaded') || data.error.includes('unavailable')) {
                shortError = 'Sunucu Meşgul';
                description = 'Kısa bir süre sonra tekrar deneyin';
              } else {
                shortError = 'API Hatası';
                description = data.error.substring(0, 100);
              }
              
              // Show toast notification instead of injecting into chat
              toast.error(shortError, {
                description,
                duration: 5000,
              });
              
              // Also add short message to chat
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `❌ **${shortError}**\n${description}`, 
                isError: true 
              }]);
              setIsLoading(false);
              return;
            }

            if (data.content) {
              assistantMessage += data.content;

              // Extract code in real-time and update tabs
              const code = extractCode(assistantMessage);
              const hasNewCode = code.html || code.css || code.js;

              if (hasNewCode) {
                setGeneratedCode({
                  html: code.html || generatedCode.html,
                  css: code.css || generatedCode.css,
                  js: code.js || generatedCode.js
                });
              }

              // Show only explanation in chat (code goes to tabs)
              const explanation = extractExplanation(assistantMessage);
              const chatContent = explanation || (hasNewCode ? '⚡ Kod oluşturuluyor... / Generating code...' : assistantMessage);

              setMessages(prev => {
                const newMessages = [...prev];
                if (messageIndex === -1) {
                  newMessages.push({ role: 'assistant', content: chatContent, hasCode: hasNewCode });
                  messageIndex = newMessages.length - 1;
                } else {
                  newMessages[messageIndex] = { role: 'assistant', content: chatContent, hasCode: hasNewCode };
                }
                return newMessages;
              });
            }

            if (data.done) {
              // Final extraction and validation
              const finalCode = extractCode(assistantMessage);
              if (finalCode.html || finalCode.css || finalCode.js) {
                const newCode = {
                  html: finalCode.html || generatedCode.html,
                  css: finalCode.css || generatedCode.css,
                  js: finalCode.js || generatedCode.js
                };
                setGeneratedCode(newCode);

                // Validate the code
                const validation = await validateCode(newCode);
                if (validation) {
                  setValidationStatus(validation);

                  // Update the message with validation result
                  const finalExplanation = extractExplanation(assistantMessage) || 'Website oluşturuldu!';
                  let statusMsg = '\n\n---\n';
                  if (validation.valid) {
                    statusMsg += `✅ **Kod başarıyla oluşturuldu ve doğrulandı!** / Code generated and validated successfully!\n\n`;
                    statusMsg += `📄 HTML: ${finalCode.html.length} karakter\n`;
                    statusMsg += `🎨 CSS: ${finalCode.css.length} karakter\n`;
                    statusMsg += `⚡ JavaScript: ${finalCode.js.length} karakter\n\n`;
                    statusMsg += `👉 Sol tarafta kodları görebilir ve önizleyebilirsiniz.`;
                  } else {
                    statusMsg += `⚠️ **Kodda hatalar tespit edildi:**\n`;
                    validation.errors.forEach(err => statusMsg += `- ${err}\n`);
                    if (validation.warnings.length > 0) {
                      statusMsg += `\n**Uyarılar:**\n`;
                      validation.warnings.forEach(w => statusMsg += `- ${w}\n`);
                    }
                  }

                  setMessages(prev => {
                    const newMessages = [...prev];
                    if (messageIndex !== -1) {
                      newMessages[messageIndex] = {
                        role: 'assistant',
                        content: finalExplanation + statusMsg,
                        hasCode: true,
                        validated: validation.valid
                      };
                    }
                    return newMessages;
                  });
                }

                // Force preview refresh
                setPreviewKey(k => k + 1);
                setActiveTab('preview');
              }
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Chat error:', error);
      
      let shortError = 'Bağlantı Hatası';
      let description = error.message.substring(0, 100);
      
      if (error.message.includes('Failed to fetch')) {
        shortError = 'Sunucuya Bağlanılamıyor';
        description = 'İnternet bağlantınızı kontrol edin';
      }
      
      toast.error(shortError, {
        description,
        duration: 5000,
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ **${shortError}**\n${description}`, 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Stop generation
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  // Clear chat and code
  const clearAll = () => {
    if (window.confirm('Tüm sohbet ve kodları silmek istediğinizden emin misiniz? / Are you sure you want to clear all chat and code?')) {
      setMessages([]);
      setGeneratedCode({ html: '', css: '', js: '' });
      setValidationStatus(null);
      setPublishStatus(null);
      setPublishedUrl(null);
      localStorage.removeItem('ai_builder_messages');
      localStorage.removeItem('ai_builder_code');
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'tr-TR';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Toggle voice recording
  const toggleVoiceInput = () => {
    if (!speechSupported) {
      toast.error('Sesli giriş desteklenmiyor', {
        description: 'Chrome veya Edge tarayıcı kullanın',
        duration: 4000,
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
        setIsRecording(false);
      }
    }
  };

  // Export to Figma-compatible format (HTML with html.to.design URL)
  const exportToFigma = () => {
    if (!generatedCode.html && !generatedCode.css) {
      toast.warning('Kod yok', {
        description: 'Figma\'ya aktarmak için önce kod oluşturun',
        duration: 3500,
      });
      return;
    }

    // Build a complete standalone HTML for Figma import
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Plater AI Design Export</title>
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
</html>`;

    // Download as HTML file for Figma import
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plater-ai-figma-export.html';
    a.click();
    URL.revokeObjectURL(url);

    // Open Figma html.to.design in a new tab
    setTimeout(() => {
      const openFigma = window.confirm(
        'HTML dosyası indirildi!\n\nFigma\'ya aktarmak için:\n1. https://www.figma.com/community/plugin/1159123024924461424 (html.to.design) plugin\'ini kurun\n2. Figma\'da yeni dosya açın\n3. Plugin\'i çalıştırın ve indirdiğiniz HTML dosyasını yükleyin\n\nFigma\'yı şimdi açalım mı?\n\nHTML file downloaded!\n\nTo import to Figma:\n1. Install html.to.design plugin\n2. Open new Figma file\n3. Run plugin and upload the HTML file\n\nOpen Figma now?'
      );
      if (openFigma) {
        window.open('https://www.figma.com/community/plugin/1159123024924461424', '_blank');
      }
    }, 500);
  };

  // Generate preview HTML - supports external libraries
  const getPreviewHTML = () => {
    // Extract any <script src> or <link href> from HTML for placement in <head>
    const html = generatedCode.html || '';
    const scriptTags = [...html.matchAll(/<script\s+src=["'][^"']+["'][^>]*><\/script>/g)].map(m => m[0]).join('\n');
    const linkTags = [...html.matchAll(/<link\s+[^>]*href=["'][^"']+["'][^>]*>/g)].map(m => m[0]).join('\n');
    
    // Remove those tags from body content
    let bodyContent = html
      .replace(/<script\s+src=["'][^"']+["'][^>]*><\/script>/g, '')
      .replace(/<link\s+[^>]*href=["'][^"']+["'][^>]*>/g, '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Preview</title>
${linkTags}
${scriptTags}
<style>
* { box-sizing: border-box; }
body { margin: 0; }
${generatedCode.css}
</style>
</head>
<body>
${bodyContent}
<script>
// Global error handler
window.addEventListener('error', function(e) {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#dc2626;color:white;padding:10px 14px;border-radius:6px;font-family:monospace;font-size:12px;max-width:400px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  errDiv.innerHTML = '<strong>JS Error:</strong> ' + e.message + '<br><small style="opacity:0.7;">Line ' + e.lineno + '</small>';
  document.body.appendChild(errDiv);
  setTimeout(() => errDiv.remove(), 8000);
});

// Wait for external libraries to load before running user code
window.addEventListener('load', function() {
  try {
${generatedCode.js}
  } catch(e) {
    console.error('Preview error:', e);
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#dc2626;color:white;padding:10px 14px;border-radius:6px;font-family:monospace;font-size:12px;max-width:400px;z-index:99999;';
    errDiv.innerHTML = '<strong>JS Error:</strong> ' + e.message;
    document.body.appendChild(errDiv);
  }
});
</script>
</body>
</html>`;
  };

  // Refresh preview
  const refreshPreview = () => {
    setPreviewKey(k => k + 1);
  };

  // Export as ZIP
  const exportAsZip = async () => {
    const zip = new JSZip();
    zip.file('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Website</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
${generatedCode.html || '<h1>Empty website</h1>'}
<script src="script.js"></script>
</body>
</html>`);
    zip.file('styles.css', generatedCode.css || '/* No styles */');
    zip.file('script.js', generatedCode.js || '// No JavaScript');
    zip.file('README.md', `# My AI Generated Website\n\nGenerated with AI Builder\n\n## Files\n- index.html: Main HTML file\n- styles.css: Stylesheet\n- script.js: JavaScript\n\n## Usage\nOpen index.html in your browser.`);

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `website-${Date.now()}.zip`);
  };

  // Export individual file
  const exportFile = (filename, content, type = 'text/plain') => {
    const blob = new Blob([content || ''], { type });
    saveAs(blob, filename);
  };

  // Publish site
  const publishSite = async () => {
    if (!generatedCode.html && !generatedCode.css && !generatedCode.js) {
      toast.warning('Yayınlanacak kod yok', {
        description: 'Önce bir website oluşturun',
        duration: 3500,
      });
      return;
    }

    setPublishStatus('publishing');
    try {
      const response = await fetch(`${API}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: generatedCode.html,
          css: generatedCode.css,
          js: generatedCode.js,
          title: 'My AI Generated Site'
        })
      });

      if (!response.ok) throw new Error('Publish failed');
      const data = await response.json();
      const fullUrl = `${BACKEND_URL}${data.url}`;
      setPublishedUrl(fullUrl);
      setPublishStatus('published');
      toast.success('Site yayınlandı!', {
        description: 'URL kopyalamak için banner\'a tıklayın',
        duration: 4000,
      });
    } catch (error) {
      setPublishStatus('error');
      toast.error('Yayınlama başarısız', {
        description: error.message.substring(0, 80),
        duration: 4000,
      });
    }
  };

  // Copy code
  const copyCode = (code, type) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Upload media file
  const uploadMedia = async (file, type) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Upload failed');
      }

      const data = await response.json();
      const fullUrl = `${BACKEND_URL}${data.url}`;
      
      const media = {
        id: data.file_id,
        url: fullUrl,
        filename: data.filename,
        type,
        contentType: data.content_type,
        size: data.size
      };
      
      setUploadedMedia(prev => [...prev, media]);
      
      // Auto-add reference to input
      const mediaPrompt = type === 'image' 
        ? `[Bu resmi kullan / Use this image: ${fullUrl}]`
        : `[Bu videoyu kullan / Use this video: ${fullUrl}]`;
      setInput(prev => prev ? `${prev}\n${mediaPrompt}` : mediaPrompt);
      
      return media;
    } catch (error) {
      toast.error('Yükleme başarısız', {
        description: error.message.substring(0, 80),
        duration: 4000,
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Geçersiz dosya', { description: 'Sadece resim dosyası seçin', duration: 3000 });
      return;
    }
    
    await uploadMedia(file, 'image');
    e.target.value = ''; // Reset input
  };

  // Handle video upload
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast.error('Geçersiz dosya', { description: 'Sadece video dosyası seçin', duration: 3000 });
      return;
    }
    
    await uploadMedia(file, 'video');
    e.target.value = ''; // Reset input
  };

  // Remove uploaded media
  const removeMedia = (id) => {
    setUploadedMedia(prev => prev.filter(m => m.id !== id));
  };

  // Insert image/video helper
  const insertMediaPrompt = (type) => {
    if (type === 'image') {
      imageInputRef.current?.click();
    } else {
      videoInputRef.current?.click();
    }
  };

  useEffect(() => {
    Prism.highlightAll();
  }, [activeTab, generatedCode]);

  const deviceWidths = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]'
  };

  // Handle welcome submit - auto-fill and send with smooth transition
  const handleWelcomeSubmit = (prompt) => {
    setWelcomeTransitioning(true);
    // Fade out welcome, fade in builder
    setTimeout(() => {
      setShowWelcome(false);
      setWelcomeTransitioning(false);
      setInput(prompt);
      // Auto-send after transition
      setTimeout(() => {
        const currentApiKey = apiKeys[provider];
        if (currentApiKey && currentApiKey.trim() !== '') {
          sendMessageWithPrompt(prompt);
        } else {
          toast.warning('API anahtarı gerekli', {
            description: 'Ayarlardan API anahtarınızı ekleyin',
            duration: 4000,
          });
        }
      }, 300);
    }, 600); // Wait for exit animation
  };

  const handleWelcomeSkip = () => {
    setWelcomeTransitioning(true);
    setTimeout(() => {
      setShowWelcome(false);
      setWelcomeTransitioning(false);
    }, 400);
  };

  // Send message with explicit prompt (for welcome auto-send)
  const sendMessageWithPrompt = async (promptText) => {
    if (!promptText.trim() || isLoading) return;
    const currentApiKey = apiKeys[provider];
    if (!currentApiKey || currentApiKey.trim() === '') return;
    
    setInput(promptText);
    setTimeout(() => {
      const btn = document.querySelector('[data-testid="send-btn"]');
      if (btn && !btn.disabled) btn.click();
    }, 50);
  };

  return (
    <>
      {showWelcome && (
        <div className={welcomeTransitioning ? 'animate-fadeOut' : ''}>
          <WelcomeScreen 
            onSubmit={handleWelcomeSubmit} 
            onSkip={handleWelcomeSkip}
          />
        </div>
      )}
    <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'}`}>
      {/* Header */}
      <header className={`h-14 border-b flex items-center justify-between px-4 shrink-0 transition-colors duration-300 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PlaterLogo size={28} />
            <span className="text-lg tracking-tight">
              <PlaterLogoText />
            </span>
          </div>
          {(generatedCode.html || generatedCode.css || generatedCode.js) && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-green-400">Kod aktif / Code active</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select value={provider} onValueChange={(val) => { setProvider(val); setModel(MODELS[val][0].value); }}>
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

          <Button
            data-testid="new-project-btn"
            variant="outline"
            size="sm"
            onClick={newProject}
            className="h-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
          >
            <Plus className="w-4 h-4 mr-1" />
            Yeni
          </Button>

          <Button
            data-testid="figma-export-btn"
            variant="outline"
            size="sm"
            onClick={exportToFigma}
            className="h-9 bg-zinc-900 border-zinc-700 hover:bg-purple-900/30 hover:border-purple-500"
            title="Figma'ya aktar / Export to Figma"
          >
            <Figma className="w-4 h-4 mr-1" />
            Figma
          </Button>

          <Button
            data-testid="publish-btn"
            variant="outline"
            size="sm"
            onClick={publishSite}
            disabled={publishStatus === 'publishing'}
            className="h-9 bg-blue-600 border-blue-500 hover:bg-blue-700 text-white"
          >
            {publishStatus === 'publishing' ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4 mr-1" />
            )}
            Yayınla / Publish
          </Button>

          <Button
            data-testid="clear-btn"
            variant="outline"
            size="icon"
            onClick={clearAll}
            className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-red-900/50 hover:border-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            data-testid="theme-toggle-btn"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={`h-9 w-9 border-zinc-700 ${theme === 'dark' ? 'bg-zinc-900 hover:bg-zinc-800 text-yellow-400' : 'bg-white hover:bg-zinc-100 text-blue-500 border-zinc-300'}`}
            title={theme === 'dark' ? 'Açık tema / Light mode' : 'Koyu tema / Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="settings-btn" variant="outline" size="icon" className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-xl text-zinc-100" style={{ fontFamily: 'IBM Plex Sans' }}>API Ayarları / API Settings</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  API anahtarlarınız yalnızca tarayıcınızda saklanır, asla sunucuya kaydedilmez.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {['openai', 'anthropic', 'gemini'].map(p => (
                  <div key={p} className="space-y-2">
                    <Label className="text-sm font-medium flex items-center justify-between text-zinc-200">
                      <span>{p.charAt(0).toUpperCase() + p.slice(1)} API Key</span>
                      {apiKeys[p] && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Kaydedildi
                        </span>
                      )}
                    </Label>
                    <Input
                      data-testid={`${p}-key-input`}
                      type="password"
                      placeholder={p === 'openai' ? 'sk-...' : p === 'anthropic' ? 'sk-ant-...' : 'AI...'}
                      value={apiKeys[p]}
                      onChange={(e) => saveApiKeys({ ...apiKeys, [p]: e.target.value })}
                      className="bg-zinc-900 border-zinc-700 focus:border-blue-500 font-mono text-xs text-zinc-100 placeholder:text-zinc-500"
                    />
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Published URL Banner */}
      {publishedUrl && (
        <div className="border-b border-green-500/20 bg-green-500/5 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Rocket className="w-4 h-4 text-green-500" />
            <span className="text-green-400">Site yayınlandı! / Site published!</span>
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono text-xs">
              {publishedUrl}
            </a>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { navigator.clipboard.writeText(publishedUrl); }}
            className="h-7 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" /> Kopyala
          </Button>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Preview/Code */}
        <div className={`flex-1 flex flex-col border-r relative overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
          <div className={`h-12 border-b flex items-center justify-between px-4 shrink-0 transition-colors duration-300 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="bg-transparent h-auto p-0 gap-1">
                <TabsTrigger data-testid="preview-tab" value="preview" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider">
                  Preview
                </TabsTrigger>
                <TabsTrigger data-testid="html-tab" value="html" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider">
                  HTML {generatedCode.html && <span className="ml-1 text-blue-400">•</span>}
                </TabsTrigger>
                <TabsTrigger data-testid="css-tab" value="css" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider">
                  CSS {generatedCode.css && <span className="ml-1 text-blue-400">•</span>}
                </TabsTrigger>
                <TabsTrigger data-testid="js-tab" value="js" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 h-8 px-3 rounded-md text-xs uppercase tracking-wider">
                  JavaScript {generatedCode.js && <span className="ml-1 text-blue-400">•</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (
                <>
                  <Button data-testid="refresh-preview-btn" variant="ghost" size="icon" onClick={refreshPreview} className="h-8 w-8">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                  <Button data-testid="device-desktop" variant="ghost" size="icon" onClick={() => setDeviceMode('desktop')} className={`h-8 w-8 ${deviceMode === 'desktop' ? 'bg-zinc-800' : ''}`}>
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button data-testid="device-tablet" variant="ghost" size="icon" onClick={() => setDeviceMode('tablet')} className={`h-8 w-8 ${deviceMode === 'tablet' ? 'bg-zinc-800' : ''}`}>
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button data-testid="device-mobile" variant="ghost" size="icon" onClick={() => setDeviceMode('mobile')} className={`h-8 w-8 ${deviceMode === 'mobile' ? 'bg-zinc-800' : ''}`}>
                    <Smartphone className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                </>
              )}

              {activeTab !== 'preview' && (
                <Button
                  data-testid={`export-${activeTab}-btn`}
                  variant="outline"
                  size="sm"
                  onClick={() => exportFile(
                    activeTab === 'html' ? 'index.html' : activeTab === 'css' ? 'styles.css' : 'script.js',
                    activeTab === 'html' ? generatedCode.html : activeTab === 'css' ? generatedCode.css : generatedCode.js
                  )}
                  className="h-8 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {activeTab.toUpperCase()}
                </Button>
              )}

              <Button data-testid="export-zip-btn" variant="outline" size="sm" onClick={exportAsZip} className="h-8 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-xs">
                <Download className="w-3 h-3 mr-1" />
                ZIP
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden bg-zinc-950">
            <Tabs value={activeTab} className="h-full flex flex-col">
              <TabsContent value="preview" className="flex-1 m-0 p-4 data-[state=active]:flex items-start justify-center overflow-auto">
                <div className={`${deviceWidths[deviceMode]} h-full bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300`}>
                  {(generatedCode.html || generatedCode.css || generatedCode.js) ? (
                    <iframe
                      key={previewKey}
                      data-testid="preview-iframe"
                      srcDoc={getPreviewHTML()}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                      title="Preview"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-zinc-900">
                      <div className="text-center text-zinc-500 max-w-md p-6">
                        <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium text-zinc-300 mb-2">Henüz website oluşturulmadı</p>
                        <p className="text-sm text-zinc-500">Sağ taraftaki chat'e istediğinizi yazın</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {['html', 'css', 'js'].map((lang) => (
                <TabsContent key={lang} value={lang} className="flex-1 m-0 overflow-auto">
                  <div className="relative min-h-full">
                    {generatedCode[lang] ? (
                      <>
                        <Button
                          data-testid={`copy-${lang}-btn`}
                          size="sm"
                          onClick={() => copyCode(generatedCode[lang], lang)}
                          className="absolute top-4 right-4 z-10 h-8 bg-zinc-800 hover:bg-zinc-700"
                        >
                          {copiedCode === lang ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <pre className={`language-${lang === 'js' ? 'javascript' : lang === 'html' ? 'markup' : 'css'} !bg-zinc-950 !m-0 !rounded-none !p-4 !min-h-full text-xs`}>
                          <code className={`language-${lang === 'js' ? 'javascript' : lang === 'html' ? 'markup' : 'css'}`}>
                            {generatedCode[lang]}
                          </code>
                        </pre>
                      </>
                    ) : (
                      <div className="h-full min-h-[400px] flex items-center justify-center text-zinc-600 text-sm">
                        <div className="text-center">
                          <Code2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Henüz {lang.toUpperCase()} kodu yok</p>
                          <p className="text-xs mt-1">Chat'te bir website istediğinizde burada görünecek</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className={`w-[420px] shrink-0 flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-900/30' : 'bg-zinc-50'}`}>
          <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-zinc-500 px-4">
                <div className="max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                    <Code2 className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-base font-medium text-zinc-300 mb-2">Websiteni oluşturmaya başla</h3>
                  <p className="text-sm text-zinc-500 mb-4">Örnek komutlar:</p>
                  <div className="space-y-2 text-xs text-left bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                    <button onClick={() => setInput('Bir web oyunu yap: renkli topları toplayan oyun (canvas)')} className="w-full text-left text-zinc-400 hover:text-blue-400 transition-colors">
                      🎮 "Bir web oyunu yap: renkli topları toplayan oyun"
                    </button>
                    <button onClick={() => setInput('Fotoğrafçı için modern portfolio sitesi (galeri, iletişim, hakkımda bölümleriyle)')} className="w-full text-left text-zinc-400 hover:text-blue-400 transition-colors">
                      📸 "Fotoğrafçı için modern portfolio sitesi"
                    </button>
                    <button onClick={() => setInput('Bir SaaS ürünü için landing page (hero, özellikler, fiyatlar, footer)')} className="w-full text-left text-zinc-400 hover:text-blue-400 transition-colors">
                      🚀 "SaaS ürünü için landing page"
                    </button>
                    <button onClick={() => setInput('Restoran menü sitesi: yemek kategorileri, fiyatlar, resimler, sipariş formu')} className="w-full text-left text-zinc-400 hover:text-blue-400 transition-colors">
                      🍽️ "Restoran menü sitesi"
                    </button>
                    <button onClick={() => setInput('Yılan oyunu yap (Snake game) klasik retro tarzda, skorla')} className="w-full text-left text-zinc-400 hover:text-blue-400 transition-colors">
                      🐍 "Klasik yılan oyunu"
                    </button>
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
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-1 border ${msg.isError ? 'bg-red-900/30 border-red-700' : msg.validated ? 'bg-green-900/30 border-green-700' : 'bg-zinc-800 border-zinc-700'}`}>
                          {msg.isError ? (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          ) : msg.validated ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Code2 className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 text-sm text-zinc-100 prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ inline, className, children, ...props }) {
                                return inline ? (
                                  <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-blue-400 text-xs font-mono" {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <code className={className} {...props}>{children}</code>
                                );
                              },
                              pre({ children }) {
                                return <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 overflow-x-auto text-xs">{children}</pre>;
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
              <ThinkingAnimation userMessage={messages[messages.length - 1]?.content || ''} />
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            data-testid="image-upload-input"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
            data-testid="video-upload-input"
          />

          {/* Uploaded Media Thumbnails */}
          {uploadedMedia.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
              <p className="text-xs text-zinc-500 mb-2">Yüklenen medya / Uploaded media:</p>
              <div className="flex gap-2 flex-wrap">
                {uploadedMedia.map(media => (
                  <div key={media.id} className="relative group" data-testid={`media-thumb-${media.id}`}>
                    {media.type === 'image' ? (
                      <img 
                        src={media.url} 
                        alt={media.filename}
                        className="w-16 h-16 object-cover rounded-md border border-zinc-700"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-md border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                        <Video className="w-6 h-6 text-zinc-500" />
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(media.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`remove-media-${media.id}`}
                    >
                      <span className="text-white text-xs leading-none">×</span>
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[9px] text-white px-1 py-0.5 truncate rounded-b-md">
                      {media.filename.substring(0, 12)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Buttons */}
          <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-950/30 flex gap-2">
            <Button
              data-testid="add-image-btn"
              variant="ghost"
              size="sm"
              onClick={() => insertMediaPrompt('image')}
              disabled={isUploading}
              className="h-7 text-xs text-zinc-400 hover:text-blue-400 disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <ImageIcon className="w-3 h-3 mr-1" />
              )}
              Resim yükle
            </Button>
            <Button
              data-testid="add-video-btn"
              variant="ghost"
              size="sm"
              onClick={() => insertMediaPrompt('video')}
              disabled={isUploading}
              className="h-7 text-xs text-zinc-400 hover:text-blue-400 disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Video className="w-3 h-3 mr-1" />
              )}
              Video yükle
            </Button>
            <div className="ml-auto text-xs text-zinc-600 self-center">
              Max 10MB
            </div>
          </div>

          {/* Input Area */}
          <div className={`p-4 border-t shrink-0 transition-colors duration-300 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-white'}`}>
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
                placeholder={isRecording ? "🎤 Dinliyor... / Listening..." : "Website'nizi tarif edin veya değişiklik isteyin..."}
                className={`flex-1 min-h-[60px] max-h-[120px] resize-none focus:ring-1 text-sm transition-colors duration-300 ${
                  theme === 'dark' 
                    ? 'bg-zinc-900 border-zinc-700 focus:border-blue-500 focus:ring-blue-500/50 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-white border-zinc-300 focus:border-blue-500 focus:ring-blue-500/50 text-zinc-900 placeholder:text-zinc-500'
                }`}
                disabled={isLoading}
              />
              <div className="flex flex-col gap-2">
                <Button
                  data-testid="voice-btn"
                  onClick={toggleVoiceInput}
                  disabled={isLoading || !speechSupported}
                  className={`h-[28px] w-[60px] ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700'} disabled:opacity-30`}
                  title={speechSupported ? (isRecording ? 'Durdur / Stop' : 'Sesli giriş / Voice input') : 'Tarayıcı desteklemiyor'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                {isLoading ? (
                  <Button
                    data-testid="stop-btn"
                    onClick={stopGeneration}
                    className="h-[28px] w-[60px] bg-red-600 hover:bg-red-700"
                  >
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                  </Button>
                ) : (
                  <Button
                    data-testid="send-btn"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="h-[28px] w-[60px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project History Bar - Bottom */}
      {projects.length > 0 && (
        <div className={`border-t shrink-0 transition-colors duration-300 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
          <div className={`flex items-center gap-2 px-4 py-2 border-b transition-colors duration-300 ${theme === 'dark' ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
            <History className="w-4 h-4 text-zinc-500" />
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              Son Projeler / Recent Projects ({projects.length})
            </span>
            <button
              data-testid="toggle-projects-btn"
              onClick={() => setShowProjectHistory(!showProjectHistory)}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
            >
              {showProjectHistory ? 'Gizle' : 'Tümünü Göster'}
            </button>
          </div>
          <div className={`flex gap-2 px-4 py-3 overflow-x-auto ${showProjectHistory ? 'flex-wrap' : ''}`}>
            {(showProjectHistory ? projects : projects.slice(0, 8)).map((project) => (
              <button
                key={project.id}
                data-testid={`project-item-${project.id}`}
                onClick={() => loadProject(project)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-md border text-xs whitespace-nowrap transition-all shrink-0 ${
                  currentProjectId === project.id
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[180px]" title={project.name}>
                  {project.name}
                </span>
                <span className="text-[10px] opacity-60">
                  {new Date(project.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span
                  onClick={(e) => deleteProject(project.id, e)}
                  data-testid={`delete-project-${project.id}`}
                  className="ml-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Builder;
