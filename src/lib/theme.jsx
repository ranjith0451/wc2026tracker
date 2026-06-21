/**
 * ThemeContext — controls color scheme (dark/light) + accent color.
 * Persists choice in localStorage. Applied as data attributes on <html>:
 *   <html data-theme="dark|light" data-accent="ocean|forest|gold|magenta|violet|sunset">
 *
 * CSS in /src/styles/themes.css reads these attributes and overrides CSS vars.
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export const ACCENTS = [
  { id: "ocean",   name: "Ocean Blue",   color: "#2563eb", swatch: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)" },
  { id: "forest",  name: "Forest Green", color: "#10b981", swatch: "linear-gradient(135deg, #34d399 0%, #059669 100%)" },
  { id: "gold",    name: "Royal Gold",   color: "#f59e0b", swatch: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)" },
  { id: "magenta", name: "Magenta",      color: "#ec4899", swatch: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)" },
  { id: "violet",  name: "Violet",       color: "#8b5cf6", swatch: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)" },
  { id: "sunset",  name: "Sunset Red",   color: "#ef4444", swatch: "linear-gradient(135deg, #fb7185 0%, #dc2626 100%)" },
];

const ThemeCtx = createContext(null);

const LS_THEME  = "wc26_theme";
const LS_ACCENT = "wc26_accent";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(LS_THEME);
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}
function getInitialAccent() {
  if (typeof window === "undefined") return "ocean";
  const saved = localStorage.getItem(LS_ACCENT);
  if (saved && ACCENTS.find(a => a.id === saved)) return saved;
  return "ocean";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [accent, setAccentState] = useState(getInitialAccent);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(LS_THEME, theme);
    // also update meta theme-color for mobile address bar
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f7f8fc" : "#0a1628");
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    localStorage.setItem(LS_ACCENT, accent);
  }, [accent]);

  const setTheme  = useCallback((t) => setThemeState(t === "light" ? "light" : "dark"), []);
  const setAccent = useCallback((a) => { if (ACCENTS.find(x => x.id === a)) setAccentState(a); }, []);
  const toggleTheme = useCallback(() => setThemeState(t => t === "dark" ? "light" : "dark"), []);

  return (
    <ThemeCtx.Provider value={{ theme, accent, setTheme, setAccent, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
