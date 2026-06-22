import { createContext, useContext, useEffect, useState } from "react";
import { THEMES, DEFAULT_THEME, DEFAULT_MODE } from "./themes.js";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("wc2026_theme");
      return saved || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem("wc2026_mode");
      return saved || DEFAULT_MODE;
    } catch {
      return DEFAULT_MODE;
    }
  });

  useEffect(() => {
    localStorage.setItem("wc2026_theme", theme);
    localStorage.setItem("wc2026_mode", mode);

    // Apply theme to DOM
    const themeConfig = THEMES[theme]?.[mode];
    if (themeConfig) {
      Object.entries(themeConfig).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
      });
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-mode", mode);
    }

    // Trigger re-render of dependent components
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme, mode } }));
  }, [theme, mode]);

  const toggleMode = () => {
    setMode((m) => (m === "light" ? "dark" : "light"));
  };

  const setThemeByName = (themeName) => {
    if (THEMES[themeName]) {
      setTheme(themeName);
    }
  };

  const value = {
    theme,
    mode,
    toggleMode,
    setThemeByName,
    availableThemes: Object.keys(THEMES),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
