import { useEffect, useState, createContext, useContext } from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Builder from "@/pages/Builder";
import Home from "@/pages/Home";

// Theme Context
export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export const useAppTheme = () => useContext(ThemeContext);

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('plater_theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('plater_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`App ${theme}`}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/builder" element={<Builder />} />
          </Routes>
        </BrowserRouter>
        <Toaster 
          theme={theme}
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'Inter, sans-serif',
            },
            className: 'plater-toast',
          }}
        />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
